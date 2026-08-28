/**
 * Discovery-unavailable contract tests. When the native sync-discovery
 * module is absent (Expo Go, a build without the module, or plain bun),
 * "찾기" must surface an explicit unavailable state instead of a quiet
 * empty list, and the paired auto-sync must not keep attempting a
 * rediscovery that can never succeed.
 *
 * Under bun no native module ever registers, so `isSyncDiscoveryAvailable()`
 * is genuinely false here — exactly the environment the first suite pins.
 * The second suite force-mocks the discovery module with a counting spy to
 * prove sync-client never even attempts the doomed discovery round-trip.
 */
import { mock, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { deleteSecureItem, setSecureItem, SecureStorageKeys } from '@/src/lib/secure-storage';
import { getSyncRuntime, resetSyncConfig, updateSyncConfig } from './sync-store';

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
      emit(): void {}

      removeAllListeners(): void {}
    },
  };
}

// Mock the core client before importing sync-client (module side effects).
mock.module('../../features/core', () => ({
  mobileCoreClient: {
    async exportData(): Promise<string> {
      return JSON.stringify({ formatVersion: 1, knowledgeItems: [] });
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

const UNAVAILABLE_MESSAGE = '이 기기에서는 Desktop 탐색을 사용할 수 없습니다.';

async function captureError(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
    return null;
  } catch (error) {
    return error;
  }
}

/** Reset every store touch these suites make so other files are unaffected. */
async function resetSyncTestState(): Promise<void> {
  resetSyncConfig();
  await deleteSecureItem(SecureStorageKeys.SYNC_PAIRING_TOKEN);
}

describe('sync discovery with the native module absent', () => {
  let client: typeof import('./sync-client');
  let discovery: typeof import('../../../modules/sync-discovery/src');

  beforeEach(async () => {
    client = await import('./sync-client');
    discovery = await import('../../../modules/sync-discovery/src');
  });

  afterEach(resetSyncTestState);

  test('discoverSyncDesktops throws the explicit unavailable error', async () => {
    expect(discovery.isSyncDiscoveryAvailable()).toBe(false);
    const error = await captureError(() => discovery.discoverSyncDesktops());
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(UNAVAILABLE_MESSAGE);
  });

  test('discoverDesktops rejects and surfaces runtime status "unavailable"', async () => {
    const error = await captureError(() => client.discoverDesktops());
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(UNAVAILABLE_MESSAGE);
    const runtime = getSyncRuntime();
    expect(runtime.status).toBe('unavailable');
    expect(runtime.error).toBe(UNAVAILABLE_MESSAGE);
  });

  test('"unavailable" is not a busy status and keeps discovered empty', async () => {
    await captureError(() => client.discoverDesktops());
    const runtime = getSyncRuntime();
    expect(['discovering', 'pairing', 'syncing']).not.toContain(runtime.status);
    expect(runtime.discovered).toEqual([]);
  });
});

describe('sync paired rediscovery while discovery is unavailable', () => {
  const discoverCalls = { count: 0 };
  let client: typeof import('./sync-client');

  beforeEach(async () => {
    discoverCalls.count = 0;
    // Force the unavailable state with a counting spy so we can prove the
    // client never even attempts the (doomed) discovery round-trip. Bun's
    // mock.module rebinding also reaches the already-cached sync-client.
    mock.module('../../../modules/sync-discovery/src', () => ({
      discoveryUnavailableError: UNAVAILABLE_MESSAGE,
      isSyncDiscoveryAvailable: () => false,
      discoverSyncDesktops: async () => {
        discoverCalls.count += 1;
        throw new Error('discovery spy must never be called');
      },
    }));
    client = await import('./sync-client');
  });

  afterEach(async () => {
    await resetSyncTestState();
  });

  test('discoverDesktops reports unavailable without attempting discovery', async () => {
    const error = await captureError(() => client.discoverDesktops());
    expect((error as Error).message).toBe(UNAVAILABLE_MESSAGE);
    expect(getSyncRuntime().status).toBe('unavailable');
    expect(discoverCalls.count).toBe(0);
  });

  test('paired sync with no endpoints fails fast instead of re-discovering', async () => {
    // Paired desktop, config with neither LAN nor tailscale URL: candidates
    // are empty, which used to trigger a silent rediscovery on every sync.
    // Without the module that can never succeed — it must be skipped.
    await setSecureItem(SecureStorageKeys.SYNC_PAIRING_TOKEN, 'test-token');
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      desktopDeviceName: 'Desktop',
      lanUrl: null,
      tailscaleUrl: null,
      autoSync: true,
    });
    // Guard against any HTTP attempt leaking out of the candidate loop.
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      throw new Error('network access is not expected in this test');
    }) as unknown as typeof fetch;
    try {
      await expect(client.syncWithDesktop({ force: true })).rejects.toThrow(
        '연결 가능한 Desktop 주소가 없습니다.',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(fetchCalled).toBe(false);
    expect(discoverCalls.count).toBe(0);
  });
});
