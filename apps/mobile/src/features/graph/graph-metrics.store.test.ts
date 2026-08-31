import { beforeEach, describe, expect, test } from 'bun:test';
import { storage, StorageKeys } from '@/src/lib/storage';
import {
  loadMobileGraphMetrics,
  recordMobileGraphCycle,
  recordMobileGraphDiscoveryOpen,
} from './graph-metrics.store';

describe('mobile graph metrics store', () => {
  beforeEach(() => {
    storage.remove(StorageKeys.GRAPH_LOCAL_METRICS);
  });

  test('발견 상세 이동과 실행 표본을 MMKV에 누적한다', () => {
    recordMobileGraphDiscoveryOpen();
    recordMobileGraphCycle({
      succeeded: true,
      durationMs: 12.5,
      processedCount: 3,
      skippedCount: 7,
      recordedAt: 100,
    });

    expect(loadMobileGraphMetrics()).toMatchObject({
      discoveryDetailOpenCount: 1,
      cycleCount: 1,
      successfulCycleCount: 1,
      failedCycleCount: 0,
      totalProcessedCount: 3,
      totalSkippedCount: 7,
      recentDurationsMs: [12.5],
      lastCycleAt: 100,
    });
  });

  test('손상된 저장 값은 빈 집계로 복구한 뒤 다시 기록한다', () => {
    storage.set(StorageKeys.GRAPH_LOCAL_METRICS, 'not-json');

    recordMobileGraphDiscoveryOpen();

    expect(loadMobileGraphMetrics().discoveryDetailOpenCount).toBe(1);
    expect(loadMobileGraphMetrics().cycleCount).toBe(0);
  });
});
