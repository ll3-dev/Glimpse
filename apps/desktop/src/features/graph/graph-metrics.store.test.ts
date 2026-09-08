import { beforeEach, describe, expect, test } from 'bun:test';
import {
  recordDesktopGraphCaptureSuccess,
  recordDesktopGraphCycle,
  recordDesktopGraphDiscoveryOpen,
  recordDesktopGraphDiscoveryOpened,
  recordDesktopGraphItemDetailOpened,
  loadDesktopGraphMetrics,
} from './graph-metrics.store';
import { computeGraphJourneyMetrics } from '@glimpse/features';

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

  test('capture → discovery → revisit 여정이 공유 계약으로 집계된다', () => {
    recordDesktopGraphCaptureSuccess('item-1');
    recordDesktopGraphDiscoveryOpened('item-1', 'item-2');
    recordDesktopGraphItemDetailOpened('item-1');

    const metrics = loadDesktopGraphMetrics();
    expect(metrics.version).toBe(2);
    expect(metrics.journeySteps.map(({ kind }) => kind)).toEqual(['capture', 'discovery', 'revisit']);

    const journey = computeGraphJourneyMetrics(metrics, { now: Date.now() });
    expect(journey.captureCount).toBe(1);
    expect(journey.captureToDiscoveryCount).toBe(1);
    expect(journey.discoveryToRevisitCount).toBe(1);
  });

  test('무관한 discovery는 capture와 상관되지 않고 쿨다운 내 반복은 1회다', () => {
    recordDesktopGraphCaptureSuccess('captured');
    recordDesktopGraphDiscoveryOpened('unrelated-a', 'unrelated-b');
    recordDesktopGraphDiscoveryOpened('unrelated-a', 'unrelated-b');
    recordDesktopGraphDiscoveryOpened('captured', 'unrelated-a');

    const metrics = loadDesktopGraphMetrics();
    expect(metrics.journeySteps.filter(({ kind }) => kind === 'discovery')).toHaveLength(2);

    const journey = computeGraphJourneyMetrics(metrics, { now: Date.now() });
    expect(journey.captureCount).toBe(1);
    expect(journey.discoveryCount).toBe(2);
    expect(journey.captureToDiscoveryCount).toBe(1);
  });

  test('여정 저장값에 원문 id나 내용이 남지 않는다', () => {
    recordDesktopGraphCaptureSuccess('private-note-identifier');

    const raw = values.get('glimpse_graph_local_metrics_v1') ?? '';
    expect(raw).not.toContain('private-note-identifier');
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
