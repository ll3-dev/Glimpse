import * as Device from 'expo-device';
import {
  discoverSyncDesktops,
  discoveryUnavailableError,
  isSyncDiscoveryAvailable,
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

/**
 * How often a watermarked client deliberately skips the incremental path and
 * uploads a full snapshot anyway. Upstream deltas now carry mobile-side edits
 * within one round-trip (ack-cursor based, see `lastAckedUpstreamClock`), so
 * reconciliation is a pure safety net: it reseals clock-skew gaps beyond the
 * 24h delta guardband, repairs any delta-path drift, and covers legacy
 * desktops without `upstreamAck`. 30 minutes bounds that residual risk while
 * keeping the vast majority of polls at KB scale.
 */
const FULL_SYNC_EVERY_MS = 30 * 60 * 1000;

/**
 * Byte ceiling for the upstream delta attachment. A delta that outgrows this
 * (first sync after unpair/re-pair, huge import) would dominate every poll's
 * payload; falling back to the watermark-null full path sends it once as the
 * periodic snapshot instead and resets the upstream cursor economy. UTF-16
 * JS strings encode ~1-2 bytes/char over gzip'd JSON, so counting chars ×2
 * is a conservative bound.
 */
const UPSTREAM_DELTA_LIMIT_BYTES = 10 * 1024 * 1024;

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
  // Distinguish "module missing" from "nothing found" up front: without the
  // native module a discovery round-trip can never succeed, so the UI must
  // see an explicit unavailable state instead of an empty result.
  if (!isSyncDiscoveryAvailable()) {
    setSyncRuntime('unavailable', discoveryUnavailableError);
    throw new Error(discoveryUnavailableError);
  }
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
  // Watermark path: when we know how far the desktop has already seen — and
  // the periodic reconciliation window is not due — skip exporting and
  // shipping the full snapshot; the request is then a few bytes. Built lazily
  // so the delta path never pays the export cost.
  const watermark =
    config.outboundWatermark != null &&
    config.lastSyncedAt != null &&
    Date.now() - config.lastSyncedAt < FULL_SYNC_EVERY_MS
      ? config.outboundWatermark
      : null;
  const snapshotPromise = watermark == null
    ? mobileCoreClient.exportData().then((data) => JSON.parse(data) as unknown)
    : null;
  // Upstream path: rows newer than the last server-acked clock ride along on
  // every watermark poll. The cursor advances only from the response's
  // `upstreamAck`, so an upload that never lands simply re-sends next time —
  // LWW merging makes the duplicate harmless. Extraction failures are not
  // fatal: the periodic full-snapshot reconciliation still carries the edits.
  const upstreamDeltaPromise =
    watermark != null && mobileCoreClient.exportDelta
      ? mobileCoreClient
          .exportDelta(config.lastAckedUpstreamClock ?? 0)
          .then((data) => JSON.parse(data) as unknown)
          .catch(() => null)
      : null;
  let lastError: unknown = new Error('연결 가능한 Desktop 주소가 없습니다.');

  const attempt = async (baseUrl: string): Promise<boolean> => {
    const requestBody: Record<string, unknown> = {
      deviceId: getOrCreateSyncDeviceId(),
      fingerprint: config.snapshotFingerprint,
    };
    if (watermark == null) {
      requestBody.snapshot = await snapshotPromise;
    } else {
      requestBody.sinceWatermark = watermark;
    }
    if (upstreamDeltaPromise) {
      const upstreamDelta = await upstreamDeltaPromise;
      if (
        upstreamDelta &&
        JSON.stringify(upstreamDelta).length * 2 <= UPSTREAM_DELTA_LIMIT_BYTES
      ) {
        // Oversized deltas fall back to the full-snapshot path: send one
        // snapshot instead of a giant attachment on every poll.
        requestBody.upstreamDelta = upstreamDelta;
      } else if (upstreamDelta) {
        requestBody.snapshot = await (snapshotPromise ??
          mobileCoreClient.exportData().then(
            (data) => JSON.parse(data) as unknown,
          ));
      }
    }
    // Large payloads ride gzip: both peers share the tower-http contract.
    const requestPayload = maybeCompressRequestBody(JSON.stringify(requestBody));
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

    if (response.delta != null) {
      // Watermark path succeeded: merge incrementally, advance the
      // watermark only from the server's own number. The merge summary counts
      // rows actually written, so an all-stale delta returns false and the
      // caller can skip refetching everything.
      const mergedJson = JSON.stringify(response.delta);
      const summary = mobileCoreClient.mergeDelta
        ? await mobileCoreClient.mergeDelta(mergedJson)
        : await mobileCoreClient.mergeData(mergedJson);
      config = updateSyncConfig({
        lastSyncedAt: Date.now(),
        outboundWatermark: response.newWatermark ?? watermark,
        lastAckedUpstreamClock: advanceAckedUpstreamClock(
          config.lastAckedUpstreamClock,
          response.upstreamAck,
        ),
        tailscaleUrl: response.endpoints.tailscaleUrl ?? config.tailscaleUrl,
      });
      return deltaAppliedSomething(summary);
    }

    if (response.snapshot != null) {
      // Full path (or the server could not serve our watermark): merge and
      // reset the watermark — the response describes desktop state as of
      // now, so an existing watermark would under-report future changes.
      await mobileCoreClient.mergeData(JSON.stringify(response.snapshot));
    }
    // A null snapshot on the full path is the fingerprint-skip answer:
    // desktop content already matches ours, so nothing was merged and the
    // caller has no reason to refetch every query.
    config = updateSyncConfig({
      lastSyncedAt: Date.now(),
      snapshotFingerprint: response.fingerprint,
      // A watermark-aware desktop answers the full path with newWatermark =
      // its dataset's highest merge clock: adopting it upgrades the next
      // poll to the incremental path. Legacy desktops omit the field — keep
      // the reset-to-full-snapshot behavior for them.
      outboundWatermark: response.newWatermark ?? null,
      // The full snapshot merged server-side carries every local row, so its
      // ack (dataset's highest clock) is also a valid upstream cursor.
      lastAckedUpstreamClock: advanceAckedUpstreamClock(
        config.lastAckedUpstreamClock,
        response.upstreamAck,
      ),
      tailscaleUrl: response.endpoints.tailscaleUrl ?? config.tailscaleUrl,
    });
    // false = nothing merged locally (fingerprint skip). The auto-sync
    // caller skips its query invalidations; manual syncs ignore the return.
    return response.snapshot != null;
  };

  for (const baseUrl of candidates) {
    try {
      const changed = await attempt(baseUrl);
      backoff = recordSuccess(backoff);
      setSyncRuntime('synced');
      // Propagate the merge verdict: false (skip / all-stale delta) lets the
      // auto-sync caller skip its query invalidations.
      return changed;
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
        const changed = await attempt(baseUrl);
        backoff = recordSuccess(backoff);
        setSyncRuntime('synced');
        return changed;
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
  // Without the native module every attempt is doomed; skip silently (and
  // without a discovery round-trip) so background auto-sync does not keep
  // retrying the impossible.
  if (!isSyncDiscoveryAvailable()) return [];
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

/** The acked upstream cursor moves forward only, and only from a
 * server-issued number. A null ack (legacy desktop) freezes the cursor —
 * the periodic full-snapshot reconciliation remains the upstream carrier
 * there, so correctness never depends on this feature being present. */
function advanceAckedUpstreamClock(
  current: number | null,
  upstreamAck: number | null | undefined,
): number | null {
  if (upstreamAck == null) return current;
  return Math.max(upstreamAck, current ?? 0);
}

/** Whether an applied delta touched any row. The merge summary counts rows
 * actually written, so an idle poll (empty/all-stale delta) reports false and
 * useAutoSync skips its global query invalidation. */
function deltaAppliedSomething(summary: {
  knowledgeItems: number;
  conversations: number;
  messages: number;
  recommendations: number;
  feedbackEvents: number;
}): boolean {
  return (
    summary.knowledgeItems > 0 ||
    summary.conversations > 0 ||
    summary.messages > 0 ||
    summary.recommendations > 0 ||
    summary.feedbackEvents > 0
  );
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
