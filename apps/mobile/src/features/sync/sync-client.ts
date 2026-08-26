import * as Device from 'expo-device';
import {
  discoverSyncDesktops,
  type DiscoveredSyncDesktop,
} from '../../../modules/sync-discovery/src';
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
import type { PairResponse, SyncResponse } from './types';

const SYNC_PROTOCOL_VERSION = 1;
const REQUEST_TIMEOUT_MS = 15_000;

let syncPromise: Promise<boolean> | null = null;

/** Tracks consecutive sync failures so auto-sync can back off exponentially. */
let consecutiveFailures = 0;
const MAX_BACKOFF_MS = 30 * 60_000;

/** Marks that the last failure was an auth rejection (401) — unrecoverable
 * without re-pairing, so we stop auto-retrying until the user acts. */
let pairingInvalidated = false;

export function syncBackoffState(): { backoffMs: number; invalidated: boolean } {
  return {
    backoffMs: Math.min(60_000 * 2 ** consecutiveFailures, MAX_BACKOFF_MS),
    invalidated: pairingInvalidated,
  };
}

export function isSyncInBackoff(now: number = Date.now()): boolean {
  if (pairingInvalidated) return true;
  return consecutiveFailures > 0 && now < backoffUntil;
}

let backoffUntil = 0;

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function discoveryBaseUrl(desktop: DiscoveredSyncDesktop): string {
  const host = desktop.host.includes(':') && !desktop.host.startsWith('[')
    ? `[${desktop.host}]`
    : desktop.host;
  return `http://${host}:${desktop.port}`;
}

export function endpointCandidates(config = getSyncConfig()): string[] {
  // The tailnet endpoint remains valid across network changes, while a cached
  // LAN address commonly becomes stale as soon as the phone leaves Wi-Fi.
  return [...new Set([config.tailscaleUrl, config.lanUrl].filter(Boolean))] as string[];
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
    pairingInvalidated = false;
    consecutiveFailures = 0;
    backoffUntil = 0;
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
    pairingInvalidated = true;
    setSyncRuntime('error', '페어링 토큰이 없습니다. 다시 페어링해 주세요.');
    return false;
  }
  if (!options.force && isSyncInBackoff()) {
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
    const response = await fetchJson<SyncResponse>(`${baseUrl}/v1/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        deviceId: getOrCreateSyncDeviceId(),
        fingerprint: config.snapshotFingerprint,
        snapshot,
      }),
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
      onSyncSuccess();
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
        onSyncSuccess();
        setSyncRuntime('synced');
        return true;
      } catch (error) {
        lastError = error;
        if (isAuthError(error)) break;
      }
    }
  }

  onSyncFailure(lastError);
  const message = errorMessage(lastError);
  setSyncRuntime('error', message);
  throw new Error(message);
}

function onSyncSuccess(): void {
  consecutiveFailures = 0;
  backoffUntil = 0;
}

function onSyncFailure(error: unknown): void {
  if (isAuthError(error)) {
    // Token rejected — retrying cannot fix it; hold until re-pairing.
    pairingInvalidated = true;
    return;
  }
  consecutiveFailures += 1;
  backoffUntil = Date.now() + syncBackoffState().backoffMs;
}

function isAuthError(error: unknown): boolean {
  return error instanceof Error && /\(401\)/.test(error.message);
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

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = (await response.json().catch(() => null)) as
      | T
      | { message?: string }
      | null;
    if (!response.ok) {
      const message =
        body && typeof body === 'object' && 'message' in body
          ? (body as { message?: string }).message
          : null;
      throw new Error(message || `Desktop 요청 실패 (${response.status})`);
    }
    if (!body) throw new Error('Desktop 응답이 비어 있습니다.');
    return body as T;
  } finally {
    clearTimeout(timeout);
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
