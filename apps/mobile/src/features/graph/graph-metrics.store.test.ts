import { beforeEach, describe, expect, test } from 'bun:test';
import { storage, StorageKeys } from '@/src/lib/storage';
import {
  loadMobileGraphMetrics,
  recordMobileGraphCaptureSuccess,
  recordMobileGraphCycle,
  recordMobileGraphDiscoveryOpen,
  recordMobileGraphDiscoveryOpened,
  recordMobileGraphItemDetailOpened,
} from './graph-metrics.store';
import { computeGraphJourneyMetrics } from '@glimpse/features';

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

  test('capture → discovery → revisit 여정이 공유 계약으로 집계된다', () => {
    recordMobileGraphCaptureSuccess('item-1');
    recordMobileGraphDiscoveryOpened('item-1', 'item-2');
    recordMobileGraphItemDetailOpened('item-1');

    const metrics = loadMobileGraphMetrics();
    expect(metrics.version).toBe(2);
    expect(metrics.journeySteps.map(({ kind }) => kind)).toEqual(['capture', 'discovery', 'revisit']);

    const journey = computeGraphJourneyMetrics(metrics, { now: Date.now() });
    expect(journey.captureCount).toBe(1);
    expect(journey.captureToDiscoveryCount).toBe(1);
    expect(journey.discoveryToRevisitCount).toBe(1);
  });

  test('무관한 discovery는 capture와 상관되지 않는다', () => {
    recordMobileGraphCaptureSuccess('captured');
    recordMobileGraphDiscoveryOpened('unrelated-a', 'unrelated-b');
    recordMobileGraphDiscoveryOpened('captured', 'unrelated-a');

    const journey = computeGraphJourneyMetrics(loadMobileGraphMetrics(), { now: Date.now() });
    expect(journey.captureCount).toBe(1);
    expect(journey.discoveryCount).toBe(2);
    expect(journey.captureToDiscoveryCount).toBe(1);
  });

  test('여정 저장값에 원문 id가 남지 않는다', () => {
    recordMobileGraphCaptureSuccess('private-note-identifier');

    const raw = storage.getString(StorageKeys.GRAPH_LOCAL_METRICS) ?? '';
    expect(raw).not.toContain('private-note-identifier');
  });
});
