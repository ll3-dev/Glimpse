/**
 * Bridge-delegation contract tests for sync-client. After the sync_plan
 * conversion, sync-client owns no backoff/URL logic: it stores whatever
 * `recordSyncFailure` / `recordSyncSuccess` return and consults
 * `isHoldingOff` at each run. These tests mock `@glimpse/bridge-generated`
 * and pin exactly that delegation:
 *
 * - the bridge-returned state is stored and fed back into later commands,
 * - a rejected bridge command fails the sync as a runtime error (no TS
 *   fallback implementation),
 * - `isSyncInBackoff` (sync interface for the background task) serves the
 *   verdict computed at the end of the last `runSync` — it never awaits the
 *   bridge just to check the hold.
 *
 * The exponential/backoff math itself is bridge ownership (Rust unit tests
 * in packages/bridge-rust/src/sync_plan.rs); the mirror defaults here only
 * keep the harness honest.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { BackoffState } from '@glimpse/bridge-generated/types';
import {
  installSyncBridgeMock,
  resetSyncBridgeMock,
  syncBridgeCalls,
  syncBridgeCanned,
} from './sync-bridge-test-mock';
import { deleteSecureItem, setSecureItem, SecureStorageKeys } from '@/src/lib/secure-storage';
import { resetSyncConfig, updateSyncConfig } from './sync-store';

// `expo-device` (pulled in by sync-client) needs the native runtime; sync
// only reads deviceName. Mock at the module boundary instead. These calls
// must run before sync-client is first imported (done lazily in each suite).
mock.module('expo-device', () => ({
  get deviceName(): string | null {
    return 'Glimpse Test Phone';
  },
  modelName: 'TestModel',
}));

// expo-modules-core's EventEmitter reads the native `globalThis.expo`
// runtime at import time (via sync-discovery's import chain). Stub it
// before anything imports those modules.
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

await installSyncBridgeMock();

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

const freshState: BackoffState = { failures: 0, invalidated: false, holdUntil: 0 };

const originalFetch = globalThis.fetch;

describe('sync-client bridge delegation contract', () => {
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

  test('runSync delegates hold-off, endpoints, and success recording to the bridge', async () => {
    syncBridgeCanned.isHoldingOff.push({ holdingOff: false });
    syncBridgeCanned.endpointCandidates.push({ endpoints: ['http://desktop.test:34129'] });
    syncBridgeCanned.recordSyncSuccess.push({ state: { failures: 3, invalidated: false, holdUntil: 0 } });

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({
        protocolVersion: 1,
        snapshot: { formatVersion: 1, knowledgeItems: [] },
        delta: null,
        newWatermark: null,
        upstreamAck: null,
        fingerprint: 'fp',
        endpoints: { localPort: 34_129, tailscaleUrl: null },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as unknown as typeof fetch;

    const { syncWithDesktop } = await import('./sync-client');
    const ok = await syncWithDesktop({ force: true });
    expect(ok).toBe(true);

    // Hold-off was consulted with the module's current state, then success
    // recording replaced it with the bridge-returned state verbatim.
    expect(syncBridgeCalls.isHoldingOff).toHaveLength(1);
    expect(syncBridgeCalls.isHoldingOff[0].state).toEqual(freshState);
    expect(syncBridgeCalls.isHoldingOff[0].force).toBe(true);
    expect(syncBridgeCalls.endpointCandidates[0]).toEqual({
      tailscaleUrl: null,
      lanUrl: 'http://desktop.test:34129',
    });
    expect(syncBridgeCalls.recordSyncSuccess).toHaveLength(1);
    // The stored state is the one the bridge returned (failures: 3).
    expect(syncBridgeCalls.recordSyncFailure).toHaveLength(0);
  });

  test('failed sync stores the bridge-returned failure state and feeds it back', async () => {
    const afterOneFailure: BackoffState = {
      failures: 1,
      invalidated: false,
      holdUntil: 1_000 + 60_000,
    };
    syncBridgeCanned.isHoldingOff.push({ holdingOff: false });
    syncBridgeCanned.endpointCandidates.push({ endpoints: [] });
    // No rediscovery available → runSync fails with no candidates.
    syncBridgeCanned.recordSyncFailure.push({ state: afterOneFailure });

    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const { syncWithDesktop } = await import('./sync-client');
    await expect(syncWithDesktop({ force: true })).rejects.toThrow();
    expect(syncBridgeCalls.recordSyncFailure).toHaveLength(1);
    expect(syncBridgeCalls.recordSyncFailure[0].state).toEqual(freshState);

    // The NEXT run must feed the stored bridge state back into isHoldingOff.
    // Run 1 made one consult (entry) — its post-failure refresh short-circuits
    // locally because the canned hold expired (holdUntil < now) — so run 2's
    // entry consult is call [1]. It feeds the stored failure state back.
    syncBridgeCanned.isHoldingOff.length = 0;
    syncBridgeCanned.isHoldingOff.push({ holdingOff: true });
    syncBridgeCalls.endpointCandidates.length = 0;
    await syncWithDesktop(); // not forced
    // A holding-off run stops before endpointCandidates.
    expect(syncBridgeCalls.isHoldingOff).toHaveLength(2);
    expect(syncBridgeCalls.isHoldingOff[1].state).toEqual(afterOneFailure);
    expect(syncBridgeCalls.isHoldingOff[1].force).toBeUndefined();
    expect(syncBridgeCalls.endpointCandidates).toHaveLength(0);
  });

  test('auth failure marks the stored state invalidated via the bridge', async () => {
    const invalidated: BackoffState = { failures: 0, invalidated: true, holdUntil: 0 };
    syncBridgeCanned.isHoldingOff.push({ holdingOff: false });
    syncBridgeCanned.endpointCandidates.push({ endpoints: ['http://desktop.test:34129'] });
    syncBridgeCanned.recordSyncFailure.push({ state: invalidated });

    // The desktop answers 401; fetchJson maps it to an auth HttpError.
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ message: '토큰 불일치' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })) as unknown as typeof fetch;

    const { syncWithDesktop } = await import('./sync-client');
    await expect(syncWithDesktop({ force: true })).rejects.toThrow();
    expect(syncBridgeCalls.recordSyncFailure[0].authRejected).toBe(true);
    // Stored state is the bridge's invalidated one. Run 2's entry consult
    // follows run 1's entry + post-failure refresh, so it is call [2] — and
    // it must feed the invalidated state back to the bridge.
    syncBridgeCanned.isHoldingOff.length = 0;
    syncBridgeCanned.isHoldingOff.push({ holdingOff: true });
    await syncWithDesktop();
    expect(syncBridgeCalls.isHoldingOff).toHaveLength(3);
    expect(syncBridgeCalls.isHoldingOff[2].state.invalidated).toBe(true);
  });

  test('re-pairing after an auth freeze clears the invalidated state (explicit reset)', async () => {
    // The freeze contract end-to-end: a 401 freezes, plain sync successes
    // must NOT unfreeze (silent unfreeze would mask a broken pairing), and
    // only re-pairing's explicit reset clears it.
    const invalidated: BackoffState = { failures: 0, invalidated: true, holdUntil: 0 };
    syncBridgeCanned.isHoldingOff.push({ holdingOff: false });
    syncBridgeCanned.endpointCandidates.push({ endpoints: ['http://desktop.test:34129'] });
    syncBridgeCanned.recordSyncFailure.push({ state: invalidated });

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ message: '토큰 불일치' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })) as unknown as typeof fetch;

    const sync = await import('./sync-client');
    await expect(sync.syncWithDesktop({ force: true })).rejects.toThrow();
    expect(syncBridgeCalls.recordSyncFailure[0].authRejected).toBe(true);

    // Re-pairing records success WITH the reset flag — the only path that
    // clears the freeze (mirror of Rust `record_sync_success`). The pair
    // endpoint answers 200 with a fresh token.
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({
        protocolVersion: 1,
        desktopDeviceId: 'desktop-test',
        desktopDeviceName: 'Desktop',
        token: 'fresh-token',
        endpoints: { tailscaleUrl: null },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as unknown as typeof fetch;
    await sync.pairWithDesktop('http://desktop.test:34129', '123456');
    const resetCall = syncBridgeCalls.recordSyncSuccess.find((call) => call.reset);
    expect(resetCall).toBeDefined();
    expect(resetCall?.reset).toBe(true);

    // The stored state is the bridge's reset (uninvalidated) state.
    syncBridgeCanned.isHoldingOff.length = 0;
    syncBridgeCanned.isHoldingOff.push({ holdingOff: false });
    syncBridgeCalls.isHoldingOff.length = 0;
    await sync.syncWithDesktop({ force: true });
    expect(syncBridgeCalls.isHoldingOff[0].state.invalidated).toBe(false);
  });

  test('bridge hold-off verdict is honored: holding runs skip the HTTP attempt', async () => {
    syncBridgeCanned.isHoldingOff.push({ holdingOff: true });
    const { syncWithDesktop } = await import('./sync-client');
    const ok = await syncWithDesktop({ force: true });
    expect(ok).toBe(false);
    expect(syncBridgeCalls.endpointCandidates).toHaveLength(0);
    expect(syncBridgeCalls.recordSyncFailure).toHaveLength(0);
  });

  test('bridge rejection fails the sync as a runtime error (no TS fallback)', async () => {
    syncBridgeCanned.isHoldingOff.push(new Error('bridge unavailable'));
    const { syncWithDesktop } = await import('./sync-client');
    await expect(syncWithDesktop({ force: true })).rejects.toThrow('bridge unavailable');
    expect(syncBridgeCalls.endpointCandidates).toHaveLength(0);
  });

  test('isSyncInBackoff serves the verdict cached at the end of the last run', async () => {
    const { isSyncInBackoff, syncWithDesktop } = await import('./sync-client');

    // Fresh module state → no hold, so the cached verdict starts false.
    expect(isSyncInBackoff()).toBe(false);

    // A failure run stores the bridge's hold verdict: later failures hold.
    const held: BackoffState = { failures: 2, invalidated: false, holdUntil: Date.now() + 60_000 };
    syncBridgeCanned.isHoldingOff.push({ holdingOff: false });
    syncBridgeCanned.endpointCandidates.push({ endpoints: [] });
    syncBridgeCanned.recordSyncFailure.push({ state: held });
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    await expect(syncWithDesktop({ force: true })).rejects.toThrow();

    // isSyncInBackoff must NOT call the bridge — it serves the cached verdict
    // (computed from the stored state at the end of the failed run).
    const callsBefore = syncBridgeCalls.isHoldingOff.length;
    expect(isSyncInBackoff()).toBe(true);
    expect(syncBridgeCalls.isHoldingOff).toHaveLength(callsBefore);
  });
});
