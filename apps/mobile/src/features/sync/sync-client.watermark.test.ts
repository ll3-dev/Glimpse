/**
 * Watermark delta-path tests for sync-client's request shaping and response
 * handling. Runs `attempt`-equivalent logic against a mocked fetch and a
 * stubbed core client: watermark present → no snapshot in the body,
 * delta response → mergeDelta + watermark advance from the server number,
 * full-snapshot response → mergeData + watermark reset.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { deleteSecureItem, setSecureItem, SecureStorageKeys } from '@/src/lib/secure-storage';
import { updateSyncConfig } from './sync-store';
import type { SyncResponse } from './types';

// `expo-device` (pulled in by sync-client) needs the native runtime; sync
// only reads deviceName. Mock at the module boundary instead.
mock.module('expo-device', () => ({
  get deviceName(): string | null {
    return 'Glimpse Test Phone';
  },
  modelName: 'TestModel',
}));

// expo-modules-core's EventEmitter reads the native `globalThis.expo`
// runtime at import time (via sync-discovery's import chain). Stub it
// before anything imports those modules.
type MinimalEventEmitter = {
  emit: (event: string, ...args: unknown[]) => void;
  removeAllListeners: (event?: string) => void;
};
const globalWithExpo = globalThis as typeof globalThis & {
  expo?: { EventEmitter: unknown };
};
if (!globalWithExpo.expo) {
  class TestEventEmitter implements MinimalEventEmitter {
    emit(): void {}

    removeAllListeners(): void {}
  }
  globalWithExpo.expo = { EventEmitter: TestEventEmitter };
}

// Mock the core client before importing sync-client (module side effects).
const calls = {
  exportData: 0,
  mergeData: [] as string[],
  mergeDelta: [] as string[],
};

mock.module('../../features/core', () => ({
  mobileCoreClient: {
    async exportData(): Promise<string> {
      calls.exportData += 1;
      return JSON.stringify({ formatVersion: 1, knowledgeItems: [], exportedAt: 0 });
    },
    async mergeData(dataJson: string): Promise<unknown> {
      calls.mergeData.push(dataJson);
      return {};
    },
    async mergeDelta(dataJson: string): Promise<unknown> {
      calls.mergeDelta.push(dataJson);
      return {};
    },
  },
}));

let lastResponseBody: Record<string, unknown> | null = null;

function stubDesktopResponse(response: SyncResponse): void {
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    const raw = init?.body as ArrayBuffer | undefined;
    const text = raw ? new TextDecoder().decode(raw) : '';
    lastResponseBody = JSON.parse(text) as Record<string, unknown>;
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

const BASE_RESPONSE: SyncResponse = {
  protocolVersion: 1,
  snapshot: null,
  delta: null,
  newWatermark: null,
  fingerprint: null,
  endpoints: { localPort: 34_129, tailscaleUrl: null },
};

describe('sync-client watermark delta path', () => {
  beforeEach(async () => {
    calls.exportData = 0;
    calls.mergeData.length = 0;
    calls.mergeDelta.length = 0;
    lastResponseBody = null;
    // runSync bails out (returning false) without a pairing token.
    await setSecureItem(SecureStorageKeys.SYNC_PAIRING_TOKEN, 'test-token');
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      desktopDeviceName: 'Desktop',
      lanUrl: 'http://desktop.test:34129',
      autoSync: true,
      snapshotFingerprint: null,
      outboundWatermark: null,
    });
  });

  afterEach(async () => {
    // Clean pairing state so other suites are unaffected.
    await deleteSecureItem(SecureStorageKeys.SYNC_PAIRING_TOKEN);
    updateSyncConfig({
      desktopDeviceId: null,
      lanUrl: null,
      snapshotFingerprint: null,
      outboundWatermark: null,
    });
  });

  test('watermark set → sends sinceWatermark and skips the snapshot upload', async () => {
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      lanUrl: 'http://desktop.test:34129',
      outboundWatermark: 500,
      // Fresh reconciliation: the watermark path may be used.
      lastSyncedAt: Date.now(),
    });
    stubDesktopResponse({
      ...BASE_RESPONSE,
      delta: { formatVersion: 1, knowledgeItems: [] },
      newWatermark: 900,
    });

    const { syncWithDesktop } = await import('./sync-client');
    const ok = await syncWithDesktop({ force: true });
    expect(ok).toBe(true);
    expect(calls.exportData).toBe(0);
    expect(lastResponseBody?.sinceWatermark).toBe(500);
    expect(lastResponseBody?.snapshot).toBeUndefined();
    expect(calls.mergeDelta).toHaveLength(1);
    const config = updateSyncConfig({});
    expect(config.outboundWatermark).toBe(900);
  });

  test('watermark held past the reconciliation window → full snapshot upload', async () => {
    // The delta request cannot carry mobile-side edits upstream, so every
    // FULL_SYNC_EVERY_MS the client must fall back to a full snapshot upload
    // even while a watermark is held.
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      lanUrl: 'http://desktop.test:34129',
      outboundWatermark: 500,
      lastSyncedAt: Date.now() - 20 * 60 * 1000,
    });
    stubDesktopResponse({
      ...BASE_RESPONSE,
      snapshot: { formatVersion: 1, knowledgeItems: [] },
      newWatermark: 900,
      fingerprint: 'print-r',
    });

    const { syncWithDesktop } = await import('./sync-client');
    await syncWithDesktop({ force: true });
    expect(calls.exportData).toBe(1, 'reconciliation must export the full snapshot');
    expect(lastResponseBody?.sinceWatermark).toBeUndefined();
    expect(lastResponseBody?.snapshot).toBeDefined();
    expect(calls.mergeData).toHaveLength(1);
    const config = updateSyncConfig({});
    expect(config.outboundWatermark).toBe(900);
    expect(config.snapshotFingerprint).toBe('print-r');
  });

  test('watermark held without a prior sync time → full snapshot upload', async () => {
    // A watermark recovered without lastSyncedAt (e.g. restored config) has
    // no recency proof — reconciliation-first is the safe default.
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      lanUrl: 'http://desktop.test:34129',
      outboundWatermark: 500,
      lastSyncedAt: null,
    });
    stubDesktopResponse({
      ...BASE_RESPONSE,
      snapshot: { formatVersion: 1, knowledgeItems: [] },
      newWatermark: 900,
    });

    const { syncWithDesktop } = await import('./sync-client');
    await syncWithDesktop({ force: true });
    expect(calls.exportData).toBe(1);
    expect(calls.mergeData).toHaveLength(1);
    const config = updateSyncConfig({});
    expect(config.outboundWatermark).toBe(900);
  });

  test('no watermark → full snapshot upload, fingerprint kept', async () => {
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      lanUrl: 'http://desktop.test:34129',
      outboundWatermark: null,
      snapshotFingerprint: 'print-1',
    });
    stubDesktopResponse({
      ...BASE_RESPONSE,
      snapshot: { formatVersion: 1, knowledgeItems: [{ id: 'x' }] },
      fingerprint: 'print-2',
    });

    const { syncWithDesktop } = await import('./sync-client');
    await syncWithDesktop({ force: true });
    expect(calls.exportData).toBe(1);
    // The uploaded snapshot is the unmodified local export from the stub.
    expect(lastResponseBody?.snapshot).toEqual({
      formatVersion: 1,
      knowledgeItems: [],
      exportedAt: 0,
    });
    expect(lastResponseBody?.sinceWatermark).toBeUndefined();
    expect(calls.mergeData).toHaveLength(1);
    const config = updateSyncConfig({});
    // Full-path responses reset any watermark and record the fresh print.
    expect(config.outboundWatermark).toBeNull();
    expect(config.snapshotFingerprint).toBe('print-2');
  });

  test('full path with newWatermark → adopted, next poll goes incremental', async () => {
    // A watermark-aware desktop answers the full path with its dataset's
    // highest merge clock; the client must adopt it so the next poll skips
    // the snapshot upload entirely instead of looping full exports forever.
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      lanUrl: 'http://desktop.test:34129',
      outboundWatermark: null,
      snapshotFingerprint: 'print-1',
    });
    stubDesktopResponse({
      ...BASE_RESPONSE,
      snapshot: { formatVersion: 1, knowledgeItems: [{ id: 'x' }] },
      newWatermark: 1_234_567,
      fingerprint: 'print-2',
    });

    const { syncWithDesktop } = await import('./sync-client');
    await syncWithDesktop({ force: true });
    expect(calls.exportData).toBe(1);
    expect(calls.mergeData).toHaveLength(1);
    const config = updateSyncConfig({});
    expect(config.outboundWatermark).toBe(1_234_567);

    // Follow-up poll: watermark held → incremental request, no export.
    stubDesktopResponse({
      ...BASE_RESPONSE,
      delta: { formatVersion: 1, knowledgeItems: [] },
      newWatermark: 1_234_567,
    });
    await syncWithDesktop({ force: true });
    expect(calls.exportData).toBe(1, 'second sync must not re-export');
    expect(lastResponseBody?.sinceWatermark).toBe(1_234_567);
    expect(calls.mergeDelta).toHaveLength(1);
  });

  test('delta-less response on a watermarked client resets the watermark (fallback)', async () => {
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      lanUrl: 'http://desktop.test:34129',
      outboundWatermark: 700,
      lastSyncedAt: Date.now(),
    });
    // An older desktop ignores sinceWatermark entirely and answers with a
    // plain (skipped) full-path response — client must drop its watermark so
    // the next sync goes back to full snapshots.
    stubDesktopResponse(BASE_RESPONSE);

    const { syncWithDesktop } = await import('./sync-client');
    await syncWithDesktop({ force: true });
    expect(calls.exportData).toBe(0);
    const config = updateSyncConfig({});
    expect(config.outboundWatermark).toBeNull();
  });
});
