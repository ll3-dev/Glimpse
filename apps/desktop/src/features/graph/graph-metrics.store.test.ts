import { beforeEach, describe, expect, test } from 'bun:test';
import {
  loadDesktopGraphMetrics,
  recordDesktopGraphCycle,
  recordDesktopGraphDiscoveryOpen,
} from './graph-metrics.store';

const values = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => void values.set(key, value),
  removeItem: (key: string) => void values.delete(key),
  clear: () => values.clear(),
};
(globalThis as Record<string, unknown>).localStorage = localStorageStub;

describe('desktop graph metrics store', () => {
  beforeEach(() => {
    values.clear();
    (globalThis as Record<string, unknown>).localStorage = localStorageStub;
  });

  test('발견 상세 이동과 성공·실패 실행 표본을 localStorage에 누적한다', () => {
    recordDesktopGraphDiscoveryOpen();
    recordDesktopGraphCycle({
      succeeded: false,
      durationMs: 8,
      processedCount: 0,
      skippedCount: 4,
      recordedAt: 200,
    });

    expect(loadDesktopGraphMetrics()).toMatchObject({
      discoveryDetailOpenCount: 1,
      cycleCount: 1,
      successfulCycleCount: 0,
      failedCycleCount: 1,
      totalProcessedCount: 0,
      totalSkippedCount: 4,
      recentDurationsMs: [8],
      lastCycleAt: 200,
    });
  });

  test('저장소 접근 실패가 사용자 흐름으로 전파되지 않는다', () => {
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };

    expect(() => recordDesktopGraphDiscoveryOpen()).not.toThrow();
    expect(loadDesktopGraphMetrics().discoveryDetailOpenCount).toBe(0);
    (globalThis as Record<string, unknown>).localStorage = localStorageStub;
  });
});
