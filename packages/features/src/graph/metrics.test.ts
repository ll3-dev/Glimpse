import { describe, expect, test } from 'bun:test';
import type {
  FeedbackEvent,
  GraphAnalysisRecord,
  KnowledgeItem,
  Recommendation,
} from '@glimpse/shared';
import {
  computeLivingGraphQualityMetrics,
} from './metrics';
import {
  MAX_GRAPH_DURATION_SAMPLES,
  createEmptyGraphLocalMetrics,
  parseGraphLocalMetrics,
  recordGraphCycleMetrics,
  recordGraphDiscoveryOpen,
} from './local-metrics';
import { LIVING_GRAPH_ANALYZER_VERSION } from './plan';

function item(id: string, updatedAt = 10): KnowledgeItem {
  return {
    id,
    type: 'note',
    title: `private-${id}`,
    body: `body-${id}`,
    url: null,
    summary: null,
    tags: null,
    createdAt: 1,
    updatedAt,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
  };
}

function record(
  itemId: string,
  status: GraphAnalysisRecord['status'],
  overrides: Partial<GraphAnalysisRecord> = {},
): GraphAnalysisRecord {
  return {
    itemId,
    itemUpdatedAt: 10,
    analyzerVersion: LIVING_GRAPH_ANALYZER_VERSION,
    analyzedAt: 1_000,
    edgeCount: status === 'completed' ? 1 : 0,
    status,
    failureCount: status === 'failed' ? 3 : 0,
    ...overrides,
  };
}

function edge(
  id: string,
  itemAId: string,
  itemBId: string,
  status: Recommendation['status'],
): Recommendation {
  return {
    id,
    itemA_id: itemAId,
    itemB_id: itemBId,
    reason: `private-reason-${id}`,
    status,
    createdAt: 1,
    respondedAt: status === 'pending' ? null : 2,
  };
}

describe('computeLivingGraphQualityMetrics', () => {
  test('현재 워터마크와 backlog, deferred, 재분석 생략을 구분한다', () => {
    const items = [item('done'), item('failed'), item('stale', 20), item('new')];
    const metrics = computeLivingGraphQualityMetrics(
      items,
      [],
      [
        record('done', 'completed'),
        record('failed', 'failed'),
        record('stale', 'completed'),
        record('deleted', 'completed'),
      ],
      [],
      { now: 1_001 },
    );

    expect(metrics.analysis).toEqual({
      targetCount: 4,
      completedCount: 1,
      failedCount: 1,
      backlogCount: 3,
      actionableBacklogCount: 2,
      deferredCount: 1,
      reanalysisSkippedCount: 1,
    });
  });

  test('유효한 연결만 상태별로 세고 visible endpoint로 고립 항목을 계산한다', () => {
    const items = [item('a'), item('b'), item('c'), item('d')];
    const recommendations = [
      edge('pending', 'a', 'b', 'pending'),
      edge('accepted', 'b', 'c', 'accepted'),
      edge('ignored', 'c', 'd', 'ignored'),
      edge('dismissed', 'a', 'd', 'dismissed'),
      edge('orphan', 'a', 'deleted', 'accepted'),
    ];
    const feedback: FeedbackEvent[] = [
      { id: 'f1', recommendationId: 'accepted', action: 'accept', createdAt: 2 },
      { id: 'f2', recommendationId: 'ignored', action: 'ignore', createdAt: 3 },
    ];

    const metrics = computeLivingGraphQualityMetrics(
      items,
      recommendations,
      [],
      feedback,
      { now: 10 },
    );

    expect(metrics.connections).toEqual({
      generatedCount: 4,
      visibleCount: 2,
      connectedItemCount: 3,
      isolatedItemCount: 1,
      statusCounts: { pending: 1, accepted: 1, ignored: 1, dismissed: 1 },
      statusRatios: { pending: 0.25, accepted: 0.25, ignored: 0.25, dismissed: 0.25 },
    });
    expect(metrics.feedbackEventCount).toBe(2);
    expect(JSON.stringify(metrics)).not.toContain('private-');
  });

  test('연결이 없을 때 모든 비율을 유한한 0으로 반환한다', () => {
    const metrics = computeLivingGraphQualityMetrics([item('solo')], [], [], [], { now: 10 });

    expect(metrics.connections.statusRatios).toEqual({
      pending: 0,
      accepted: 0,
      ignored: 0,
      dismissed: 0,
    });
    expect(Object.values(metrics.connections.statusRatios).every(Number.isFinite)).toBe(true);
  });
});

describe('local graph metrics', () => {
  test('발견 이동과 실행 결과를 누적하고 duration 표본을 제한한다', () => {
    let metrics = recordGraphDiscoveryOpen(createEmptyGraphLocalMetrics());
    for (let index = 0; index < MAX_GRAPH_DURATION_SAMPLES + 3; index += 1) {
      metrics = recordGraphCycleMetrics(metrics, {
        succeeded: index % 2 === 0,
        durationMs: index + 0.5,
        processedCount: 2,
        skippedCount: 4,
        recordedAt: 100 + index,
      });
    }

    expect(metrics.discoveryDetailOpenCount).toBe(1);
    expect(metrics.cycleCount).toBe(MAX_GRAPH_DURATION_SAMPLES + 3);
    expect(metrics.successfulCycleCount + metrics.failedCycleCount).toBe(metrics.cycleCount);
    expect(metrics.totalProcessedCount).toBe((MAX_GRAPH_DURATION_SAMPLES + 3) * 2);
    expect(metrics.totalSkippedCount).toBe((MAX_GRAPH_DURATION_SAMPLES + 3) * 4);
    expect(metrics.recentDurationsMs).toHaveLength(MAX_GRAPH_DURATION_SAMPLES);
    expect(metrics.recentDurationsMs[0]).toBe(3.5);
    expect(metrics.lastCycleAt).toBe(100 + MAX_GRAPH_DURATION_SAMPLES + 2);
  });

  test('손상되거나 구버전인 저장 값은 빈 집계로 복구한다', () => {
    expect(parseGraphLocalMetrics('{bad json')).toEqual(createEmptyGraphLocalMetrics());
    expect(parseGraphLocalMetrics(JSON.stringify({ version: 2 }))).toEqual(
      createEmptyGraphLocalMetrics(),
    );
  });
});
