/**
 * Upstream delta-path tests for sync-client: watermark present → the local
 * delta (rows newer than the last acked upstream clock) rides in the request
 * body as `upstreamDelta`, and the server's `upstreamAck` is the only thing
 * that may advance `lastAckedUpstreamClock`. Failure paths must leave the
 * cursor untouched so the next attempt re-sends the same rows (idempotent
 * under LWW).
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { deleteSecureItem, setSecureItem, SecureStorageKeys } from '@/src/lib/secure-storage';
import { updateSyncConfig } from './sync-store';
import type { SyncResponse } from './types';

mock.module('expo-device', () => ({
  get deviceName(): string | null {
    return 'Glimpse Test Phone';
  },
  modelName: 'TestModel',
}));

type MinimalEventEmitter = {
  addListener: () => { remove: () => void };
  removeListener: () => void;
  emit: (event: string, ...args: unknown[]) => void;
  removeAllListeners: (event?: string) => void;
  listenerCount: () => number;
};
const globalWithExpo = globalThis as typeof globalThis & {
  expo?: { EventEmitter: unknown };
};
if (!globalWithExpo.expo) {
  class TestEventEmitter implements MinimalEventEmitter {
    addListener(): { remove: () => void } {
      return { remove: () => {} };
    }

    removeListener(): void {}

    emit(): void {}

    removeAllListeners(): void {}

    listenerCount(): number {
      return 0;
    }
  }
  globalWithExpo.expo = { EventEmitter: TestEventEmitter } as typeof globalWithExpo.expo;
}

const calls = {
  exportDelta: [] as number[],
  exportData: 0,
  mergeData: [] as string[],
  mergeDelta: [] as string[],
};

/** Mutable stub the tests can hot-swap per case (e.g. oversized delta). */
const mobileCoreClientStub = {
  async exportDelta(sinceClockMs: number): Promise<string> {
    calls.exportDelta.push(sinceClockMs);
    return JSON.stringify({
      formatVersion: 1,
      exportedAt: 0,
      knowledgeItems: [{ id: 'mobile-only', updatedAt: 800 }],
      conversations: [],
      messages: [],
      recommendations: [],
      feedbackEvents: [],
      tombstones: [],
    });
  },
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
    return {
      knowledgeItems: 1,
      conversations: 0,
      messages: 0,
      recommendations: 0,
      feedbackEvents: 0,
    };
  },
};

mock.module('../../features/core', () => ({
  mobileCoreClient: mobileCoreClientStub,
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

function stubUnreachableDesktop(): void {
  globalThis.fetch = (async () => {
    throw new Error('network down');
  }) as unknown as typeof fetch;
}

const BASE_RESPONSE: SyncResponse = {
  protocolVersion: 1,
  snapshot: null,
  delta: null,
  newWatermark: null,
  upstreamAck: null,
  fingerprint: null,
  endpoints: { localPort: 34_129, tailscaleUrl: null },
};

describe('sync-client upstream delta path', () => {
  beforeEach(async () => {
    calls.exportDelta.length = 0;
    calls.exportData = 0;
    calls.mergeData.length = 0;
    calls.mergeDelta.length = 0;
    lastResponseBody = null;
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
    await deleteSecureItem(SecureStorageKeys.SYNC_PAIRING_TOKEN);
    updateSyncConfig({
      desktopDeviceId: null,
      lanUrl: null,
      snapshotFingerprint: null,
      outboundWatermark: null,
      lastAckedUpstreamClock: null,
    });
  });

  test('watermark path attaches upstreamDelta exported from the acked cursor', async () => {
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      lanUrl: 'http://desktop.test:34129',
      outboundWatermark: 500,
      lastAckedUpstreamClock: 700,
      lastSyncedAt: Date.now(),
    });
    stubDesktopResponse({
      ...BASE_RESPONSE,
      delta: { formatVersion: 1, knowledgeItems: [] },
      newWatermark: 900,
      upstreamAck: 800,
    });

    const { syncWithDesktop } = await import('./sync-client');
    const ok = await syncWithDesktop({ force: true });
    expect(ok).toBe(true);
    expect(calls.exportDelta).toEqual([700]);
    expect(lastResponseBody?.upstreamDelta).toBeDefined();
    expect(lastResponseBody?.sinceWatermark).toBe(500);
    // Ack from the server is the only thing that moves the cursor.
    expect(updateSyncConfig({}).lastAckedUpstreamClock).toBe(800);
  });

  test('no prior ack → delta exported from 0 (full history, LWW-deduplicated)', async () => {
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      lanUrl: 'http://desktop.test:34129',
      outboundWatermark: 100,
      lastAckedUpstreamClock: null,
      lastSyncedAt: Date.now(),
    });
    stubDesktopResponse({
      ...BASE_RESPONSE,
      delta: { formatVersion: 1, knowledgeItems: [] },
      newWatermark: 300,
      upstreamAck: 400,
    });

    const { syncWithDesktop } = await import('./sync-client');
    await syncWithDesktop({ force: true });
    expect(calls.exportDelta).toEqual([0]);
    expect(updateSyncConfig({}).lastAckedUpstreamClock).toBe(400);
  });

  test('failed transfer leaves the ack cursor untouched', async () => {
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      lanUrl: 'http://desktop.test:34129',
      outboundWatermark: 500,
      lastAckedUpstreamClock: 700,
      lastSyncedAt: Date.now(),
    });
    stubUnreachableDesktop();

    const { syncWithDesktop } = await import('./sync-client');
    await expect(syncWithDesktop({ force: true })).rejects.toThrow();
    expect(updateSyncConfig({}).lastAckedUpstreamClock).toBe(700);
  });

  test('legacy server response without upstreamAck keeps the cursor frozen', async () => {
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      lanUrl: 'http://desktop.test:34129',
      outboundWatermark: 500,
      lastAckedUpstreamClock: 700,
      lastSyncedAt: Date.now(),
    });
    stubDesktopResponse({
      ...BASE_RESPONSE,
      delta: { formatVersion: 1, knowledgeItems: [] },
      newWatermark: 900,
      // upstreamAck absent → legacy desktop never merged the upstream delta.
      upstreamAck: null,
    });

    const { syncWithDesktop } = await import('./sync-client');
    await syncWithDesktop({ force: true });
    expect(updateSyncConfig({}).lastAckedUpstreamClock).toBe(700);
  });

  test('upstream ack also lands on the full-snapshot path', async () => {
    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      lanUrl: 'http://desktop.test:34129',
      outboundWatermark: null,
      lastAckedUpstreamClock: null,
    });
    stubDesktopResponse({
      ...BASE_RESPONSE,
      snapshot: { formatVersion: 1, knowledgeItems: [{ id: 'x' }] },
      newWatermark: 900,
      fingerprint: 'print-r',
      upstreamAck: 650,
    });

    const { syncWithDesktop } = await import('./sync-client');
    await syncWithDesktop({ force: true });
    expect(calls.mergeData).toHaveLength(1);
    const config = updateSyncConfig({});
    expect(config.lastAckedUpstreamClock).toBe(650);
    expect(config.outboundWatermark).toBe(900);
  });

  test('oversized upstream delta falls back to the full-snapshot path', async () => {
    // 10MB 한도를 넘는 델타(문자 수 기준 2바이트/문자 보수 추정)는 매 폴링마다
    // 첨부되는 대신 전체 스냅샷 한 번으로 대체 전송된다.
    const oversized = {
      formatVersion: 1,
      exportedAt: 0,
      knowledgeItems: [{ id: 'big', body: 'x'.repeat(6 * 1024 * 1024) }],
      conversations: [],
      messages: [],
      recommendations: [],
      feedbackEvents: [],
      tombstones: [],
    };
    const originalExportDelta = mobileCoreClientStub.exportDelta;
    mobileCoreClientStub.exportDelta = async () => JSON.stringify(oversized);

    updateSyncConfig({
      desktopDeviceId: 'desktop-test',
      lanUrl: 'http://desktop.test:34129',
      outboundWatermark: 500,
      lastAckedUpstreamClock: 700,
      lastSyncedAt: Date.now(),
    });
    stubDesktopResponse({
      ...BASE_RESPONSE,
      snapshot: { formatVersion: 1, knowledgeItems: [] },
      newWatermark: 900,
      fingerprint: 'print-fallback',
    });

    try {
      const { syncWithDesktop } = await import('./sync-client');
      await syncWithDesktop({ force: true });
      expect(lastResponseBody?.upstreamDelta).toBeUndefined();
      expect(lastResponseBody?.snapshot).toBeDefined();
      expect(calls.mergeData).toHaveLength(1);
    } finally {
      mobileCoreClientStub.exportDelta = originalExportDelta;
    }
  });
});
