/**
 * Integration tests for the auth-error → invalidated-backoff branch in
 * sync-client, now that the backoff controller lives in the rustra bridge
 * (`sync_plan.rs`). These pin the TS-side contract: fetchJson maps a 401
 * response to an `HttpError` carrying the status, `isAuthError` classifies
 * it, and runSync forwards `authRejected: true` to `recordSyncFailure` —
 * the bridge then decides to freeze. The exponential math itself is asserted
 * by Rust unit tests and mirrored (not re-owned) by the mock defaults.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { BackoffState } from '@glimpse/bridge-generated/types';
import {
  installSyncBridgeMock,
  resetSyncBridgeMock,
  syncBridgeCalls,
  syncBridgeCanned,
} from './sync-bridge-test-mock';
import { HttpError, isAuthError } from './sync-url';
import { deleteSecureItem, setSecureItem, SecureStorageKeys } from '@/src/lib/secure-storage';
import { resetSyncConfig, updateSyncConfig } from './sync-store';

mock.module('expo-device', () => ({
  get deviceName(): string | null {
    return 'Glimpse Test Phone';
  },
  modelName: 'TestModel',
}));

const globalWithExpo = globalThis as typeof globalThis & {
  expo?: { EventEmitter: unknown };
};
if (!globalWithExpo.expo) {
  globalWithExpo.expo = {
    EventEmitter: class {
      addListener(): { remove(): void } {
        return { remove(): void {} };
      }

      removeListener(): void {}

      emit(): void {}

      removeAllListeners(): void {}

      listenerCount(): number {
        return 0;
      }
    },
  } as typeof globalWithExpo.expo;
}

installSyncBridgeMock();

// runSync builds the snapshot export before attempting any endpoint, so the
// core client must be stubbed too (only the pieces the contract touches).
mock.module('../../features/core', () => ({
  mobileCoreClient: {
    async exportData(): Promise<string> {
      return JSON.stringify({ formatVersion: 1, knowledgeItems: [], exportedAt: 0 });
    },
    async mergeData(): Promise<unknown> {
      return {};
    },
    async mergeDelta(): Promise<unknown> {
      return {
        knowledgeItems: 0,
        conversations: 0,
        messages: 0,
        recommendations: 0,
        feedbackEvents: 0,
      };
    },
  },
}));

const originalFetch = globalThis.fetch;

describe('sync auth vs transient failure classification', () => {
  beforeEach(async () => {
    // unpairDesktop resets the module-level backoff state (through the
    // bridge), so every test starts from a fresh controller despite
    // sync-client's module cache.
    const { unpairDesktop } = await import('./sync-client');
    await unpairDesktop();
    resetSyncBridgeMock();
    await setSecureItem(SecureStorageKeys.SYNC_PAIRING_TOKEN, 'test-token');
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      desktopDeviceName: 'Desktop',
      lanUrl: 'http://desktop.test:34129',
      autoSync: true,
      snapshotFingerprint: null,
      outboundWatermark: null,
      lastAckedUpstreamClock: null,
    });
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await deleteSecureItem(SecureStorageKeys.SYNC_PAIRING_TOKEN);
    resetSyncConfig();
  });

  test('401 failure forwards authRejected to the bridge and stores the invalidated state', async () => {
    const invalidated: BackoffState = { failures: 0, invalidated: true, holdUntil: 0 };
    syncBridgeCanned.isHoldingOff.push({ holdingOff: false });
    syncBridgeCanned.endpointCandidates.push({ endpoints: ['http://desktop.test:34129'] });
    syncBridgeCanned.recordSyncFailure.push({ state: invalidated });

    mockFetchResponses({ status: 401, body: { message: '저장된 페어링과 일치하지 않습니다.' } });

    const { syncWithDesktop } = await import('./sync-client');
    await expect(syncWithDesktop({ force: true })).rejects.toThrow();
    expect(syncBridgeCalls.recordSyncFailure).toHaveLength(1);
    expect(syncBridgeCalls.recordSyncFailure[0].authRejected).toBe(true);

    // The bridge-returned invalidated state is what the next run consults —
    // even far in the future the stored verdict says "hold", and only a
    // forced (manual) sync bypasses it. (Call [0] in this window is
    // refreshHoldOffVerdict's recomputation; the run is call [1].)
    syncBridgeCanned.isHoldingOff.length = 0;
    syncBridgeCanned.isHoldingOff.push({ holdingOff: true });
    await syncWithDesktop({ force: false });
    expect(syncBridgeCalls.isHoldingOff).toHaveLength(1);
    expect(syncBridgeCalls.isHoldingOff[0].state.invalidated).toBe(true);
  });

  test('transient 500 failure records a retryable failure (authRejected false)', async () => {
    const afterOneFailure: BackoffState = {
      failures: 1,
      invalidated: false,
      holdUntil: 1_000 + 60_000,
    };
    syncBridgeCanned.isHoldingOff.push({ holdingOff: false });
    syncBridgeCanned.endpointCandidates.push({ endpoints: ['http://desktop.test:34129'] });
    syncBridgeCanned.recordSyncFailure.push({ state: afterOneFailure });

    mockFetchResponses({ status: 500, body: { message: '서버 오류' } });

    const { syncWithDesktop } = await import('./sync-client');
    await expect(syncWithDesktop({ force: true })).rejects.toThrow();
    expect(syncBridgeCalls.recordSyncFailure).toHaveLength(1);
    expect(syncBridgeCalls.recordSyncFailure[0].authRejected).toBe(false);
  });

  test('fetchJson-style mapping turns a 401 response into an auth HttpError', async () => {
    // Mirror of fetchJson's non-ok branch against a real mocked Response:
    // the server's Korean body wins as the message, the status rides along,
    // and only the combination (not message text) classifies as an auth error.
    mockFetchResponses({ status: 401, body: { code: 'authorization_failed', message: '저장된 페어링과 일치하지 않습니다.' } });
    const error = await captureError(() => postToMockedDesktop());
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(401);
    expect((error as HttpError).message).toBe('저장된 페어링과 일치하지 않습니다.');
    expect(isAuthError(error)).toBe(true);

    // The old bug in reverse: a 401 whose body carries no "(401)" text must
    // still be classified via status alone.
    mockFetchResponses({ status: 401, body: null });
    const emptyBodyError = await captureError(() => postToMockedDesktop());
    expect(isAuthError(emptyBodyError)).toBe(true);

    // A 500 never is.
    mockFetchResponses({ status: 500, body: { message: '내부 오류' } });
    const serverError = await captureError(() => postToMockedDesktop());
    expect(isAuthError(serverError)).toBe(false);
  });

  test('3xx redirect responses are rejected instead of followed', async () => {
    // fetchJson rejects any 3xx that slips past `redirect: 'error'`; here the
    // mocked fetch simulates an implementation that returned one anyway.
    mockFetchResponses({ status: 302, body: null });
    const error = await captureError(() => postToMockedDesktop());
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(302);
    expect(isAuthError(error)).toBe(false);
  });
});

function mockFetchResponses(response: { status: number; body: unknown }): void {
  globalThis.fetch = (async () =>
    new Response(response.body == null ? '' : JSON.stringify(response.body), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch;
}

/** Mirrors sync-client's fetchJson error mapping (non-ok branch). */
async function postToMockedDesktop(): Promise<unknown> {
  const response = await fetch('http://desktop.test:34129/v1/sync', { method: 'POST' });
  if (response.status >= 300 && response.status < 400) {
    throw new HttpError('Desktop가 리다이렉트로 응답했습니다.', response.status);
  }
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) {
    throw new HttpError(
      body?.message || `Desktop 요청 실패 (${response.status})`,
      response.status,
    );
  }
  return body;
}

async function captureError(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
    return null;
  } catch (error) {
    return error;
  }
}
