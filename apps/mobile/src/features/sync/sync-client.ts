import * as Device from 'expo-device';
import { discoverSyncDesktops, type DiscoveredSyncDesktop } from '../../../modules/sync-discovery/src';
import { mobileCoreClient } from '@/src/features/core';
import { generateId } from '@/src/lib/id';
import { storage, StorageKeys } from '@/src/lib/storage';
import {
  deleteSecureItem,
  getSecureItem,
  SecureStorageKeys,
  setSecureItem,
} from '@/src/lib/secure-storage';
import { logger } from '@/src/utils/logger';
import {
  getSyncConfig,
  resetSyncConfig,
  setDiscoveredSyncDesktops,
  setSyncRuntime,
  updateSyncConfig,
} from './sync-store';
import {
  createBackoffController,
  isHoldingOff,
  recordFailure,
  recordSuccess,
  type BackoffController,
} from './backoff';
import {
  discoveryBaseUrl,
  endpointCandidates,
  HttpError,
  isAuthError,
  normalizeBaseUrl,
} from './sync-url';
import {
  maybeCompressRequestBody,
  parseResponseBody,
} from './payload-compression';
import type { PairResponse, SyncResponse } from './types';

const SYNC_PROTOCOL_VERSION = 1;
const REQUEST_TIMEOUT_MS = 15_000;

let syncPromise: Promise<boolean> | null = null;

/** Module-level backoff state shared across auto-sync invocations.
 * Exposed to siblings via `readSyncBackoff` so the background task can check
 * the hold-off without importing private module state. */
let backoff: BackoffController = createBackoffController();

export function isSyncInBackoff(now: number = Date.now()): boolean {
  return isHoldingOff(backoff, now);
}

export function getOrCreateSyncDeviceId(): string {
  const existing = storage.getString(StorageKeys.SYNC_DEVICE_ID);
  if (existing) return existing;
  const id = generateId();
  storage.set(StorageKeys.SYNC_DEVICE_ID, id);
  return id;
}

export async function discoverDesktops(): Promise<DiscoveredSyncDesktop[]> {
  setSyncRuntime('discovering');
  try {
    const discovered = await discoverSyncDesktops();
    setDiscoveredSyncDesktops(discovered);
    setSyncRuntime('idle');
    return discovered;
  } catch (error) {
    const message = errorMessage(error);
    setSyncRuntime('error', message);
    throw new Error(message);
  }
}

export async function pairWithDesktop(baseUrl: string, pairingCode: string): Promise<void> {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) {
    throw new Error('Desktop 주소를 입력해 주세요.');
  }
  if (!/^\d{6}$/.test(pairingCode.trim())) {
    throw new Error('Desktop에 표시된 6자리 코드를 입력해 주세요.');
  }

  setSyncRuntime('pairing');
  try {
    const response = await fetchJson<PairResponse>(`${normalized}/v1/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getOrCreateSyncDeviceId(),
        deviceName: Device.deviceName ?? Device.modelName ?? 'Glimpse Mobile',
        pairingCode: pairingCode.trim(),
      }),
    });
    assertProtocol(response.protocolVersion);
    await setSecureItem(SecureStorageKeys.SYNC_PAIRING_TOKEN, response.token);
    updateSyncConfig({
      desktopDeviceId: response.desktopDeviceId,
      desktopDeviceName: response.desktopDeviceName,
      lanUrl: normalized.startsWith('http://') ? normalized : null,
      tailscaleUrl:
        response.endpoints.tailscaleUrl ??
        (normalized.startsWith('https://') ? normalized : null),
      autoSync: true,
    });
    setSyncRuntime('idle');
    backoff = createBackoffController();
    await syncWithDesktop({ force: true });
  } catch (error) {
    const message = errorMessage(error);
    setSyncRuntime('error', message);
    throw new Error(message);
  }
}

export async function unpairDesktop(): Promise<void> {
  await deleteSecureItem(SecureStorageKeys.SYNC_PAIRING_TOKEN);
  resetSyncConfig();
}

export async function syncWithDesktop(
  options: { force?: boolean } = {},
): Promise<boolean> {
  if (syncPromise) return syncPromise;
  syncPromise = runSync(options).finally(() => {
    syncPromise = null;
  });
  return syncPromise;
}

async function runSync(options: { force?: boolean }): Promise<boolean> {
  let config = getSyncConfig();
  if (!config.desktopDeviceId || (!config.autoSync && !options.force)) {
    return false;
  }
  const token = await getSecureItem(SecureStorageKeys.SYNC_PAIRING_TOKEN);
  if (!token) {
    backoff = recordFailure(backoff, Date.now(), true);
    setSyncRuntime('error', '페어링 토큰이 없습니다. 다시 페어링해 주세요.');
    return false;
  }
  if (isHoldingOff(backoff, Date.now(), options)) {
    // Auto-sync cooldown after failures; a manual sync always ignores it.
    return false;
  }

  setSyncRuntime('syncing');
  let candidates = endpointCandidates(config);
  if (candidates.length === 0) {
    candidates = await rediscoverPairedDesktop(config.desktopDeviceId);
  }
  const snapshot = JSON.parse(await mobileCoreClient.exportData()) as unknown;
  let lastError: unknown = new Error('연결 가능한 Desktop 주소가 없습니다.');

  const attempt = async (baseUrl: string): Promise<boolean> => {
    // Large snapshots ride gzip: both peers share the tower-http contract.
    const requestPayload = maybeCompressRequestBody(
      JSON.stringify({
        deviceId: getOrCreateSyncDeviceId(),
        fingerprint: config.snapshotFingerprint,
        snapshot,
      }),
    );
    const response = await fetchJson<SyncResponse>(`${baseUrl}/v1/sync`, {
      method: 'POST',
      headers: {
        ...requestPayload.headers,
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        Authorization: `Bearer ${token}`,
      },
      body: requestPayload.body.buffer.slice(
        requestPayload.body.byteOffset,
        requestPayload.body.byteOffset + requestPayload.body.byteLength,
      ) as ArrayBuffer,
    });
    assertProtocol(response.protocolVersion);
    if (response.snapshot != null) {
      await mobileCoreClient.mergeData(JSON.stringify(response.snapshot));
    }
    config = updateSyncConfig({
      lastSyncedAt: Date.now(),
      snapshotFingerprint: response.fingerprint,
      tailscaleUrl: response.endpoints.tailscaleUrl ?? config.tailscaleUrl,
    });
    return true;
  };

  for (const baseUrl of candidates) {
    try {
      await attempt(baseUrl);
      backoff = recordSuccess(backoff);
      setSyncRuntime('synced');
      return true;
    } catch (error) {
      lastError = error;
      logger.warn('Desktop sync endpoint failed', { baseUrl, error: errorMessage(error) });
      if (isAuthError(error)) break;
    }
  }

  if (!isAuthError(lastError)) {
    const rediscovered = await rediscoverPairedDesktop(config.desktopDeviceId);
    for (const baseUrl of rediscovered.filter((url) => !candidates.includes(url))) {
      try {
        await attempt(baseUrl);
        backoff = recordSuccess(backoff);
        setSyncRuntime('synced');
        return true;
      } catch (error) {
        lastError = error;
        if (isAuthError(error)) break;
      }
    }
  }

  backoff = recordFailure(backoff, Date.now(), isAuthError(lastError));
  const message = errorMessage(lastError);
  setSyncRuntime('error', message);
  throw new Error(message);
}

async function rediscoverPairedDesktop(deviceId: string): Promise<string[]> {
  try {
    const found = await discoverSyncDesktops(1_500);
    setDiscoveredSyncDesktops(found);
    const paired = found.find((desktop) => desktop.deviceId === deviceId);
    if (!paired) return [];
    const lanUrl = discoveryBaseUrl(paired);
    updateSyncConfig({ lanUrl });
    return [lanUrl];
  } catch {
    return [];
  }
}

async function fetchJson<T>(url: string, init: RequestInit & { headers?: Record<string, string> }): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // Never follow redirects: the pairing token must not be replayed against
    // a different origin a 30x might point us at. Not every React Native
    // fetch implementation honors `redirect`, so 3xx responses that do slip
    // through are rejected below as well.
    const response = await fetch(url, {
      ...init,
      redirect: 'error',
      signal: controller.signal,
    });
    if (response.status >= 300 && response.status < 400) {
      throw new HttpError('Desktop가 리다이렉트로 응답했습니다.', response.status);
    }
    const contentEncoding = response.headers.get('content-encoding');
    // Error bodies are small; read them as text so both plain and gzipped
    // success paths share one decoder.
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const body = text ? (safeParse(text) as { message?: string } | null) : null;
      const serverMessage = body?.message ?? null;
      throw new HttpError(
        serverMessage || `Desktop 요청 실패 (${response.status})`,
        response.status,
      );
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0) throw new Error('Desktop 응답이 비어 있습니다.');
    return parseResponseBody<T>(bytes, contentEncoding);
  } finally {
    clearTimeout(timeout);
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function assertProtocol(version: number): void {
  if (version !== SYNC_PROTOCOL_VERSION) {
    throw new Error(`지원하지 않는 sync protocol입니다: ${version}`);
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'Desktop 연결 시간이 초과되었습니다.';
    return error.message;
  }
  return String(error);
}
