import assert from 'node:assert/strict';
import type {
  FeedbackEvent,
  GraphAnalysisRecord,
  KnowledgeItem,
  Recommendation,
} from '@glimpse/shared';
import {
  LIVING_GRAPH_ANALYZER_VERSION,
  type LivingGraphQualityMetrics,
} from '@glimpse/features';

export interface ReceiptScenarioInput {
  name: 'cold_start' | 'unchanged' | 'updated' | 'deleted' | 'synced';
  items: KnowledgeItem[];
  recommendations: Recommendation[];
  records: GraphAnalysisRecord[];
  feedbackEvents: FeedbackEvent[];
  expected: {
    targets: number;
    completed: number;
    backlog: number;
    skipped: number;
    generated: number;
  };
}

function item(id: string, updatedAt: number): KnowledgeItem {
  return {
    id,
    type: 'note',
    title: null,
    body: null,
    url: null,
    summary: null,
    tags: null,
    createdAt: updatedAt - 1,
    updatedAt,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
  };
}

function analysisRecord(value: KnowledgeItem): GraphAnalysisRecord {
  return {
    itemId: value.id,
    itemUpdatedAt: value.updatedAt,
    analyzerVersion: LIVING_GRAPH_ANALYZER_VERSION,
    analyzedAt: 5_000,
    edgeCount: 1,
    status: 'completed',
    failureCount: 0,
  };
}

export function createReceiptScenarios(seedDigest: string): ReceiptScenarioInput[] {
  const prefix = seedDigest.slice(0, 12);
  const items = Array.from({ length: 24 }, (_, index) =>
    item(`${prefix}-${index}`, 1_000 + index),
  );
  const records = items.map(analysisRecord);
  const statuses: Recommendation['status'][] = [
    'pending',
    'accepted',
    'ignored',
    'dismissed',
  ];
  const recommendations = Array.from({ length: 12 }, (_, index): Recommendation => ({
    id: `${prefix}-edge-${index}`,
    itemA_id: items[index * 2].id,
    itemB_id: items[index * 2 + 1].id,
    reason: null,
    status: statuses[index % statuses.length],
    createdAt: 2_000 + index,
    respondedAt: index % statuses.length === 0 ? null : 3_000 + index,
  }));
  const feedbackEvents = recommendations.slice(0, 4).map((recommendation, index): FeedbackEvent => ({
    id: `${prefix}-feedback-${index}`,
    recommendationId: recommendation.id,
    action: index === 0 ? 'accept' : index === 1 ? 'ignore' : 'dismiss',
    createdAt: 4_000 + index,
  }));
  const updatedItems = items.map((value, index) =>
    index < 3 ? { ...value, updatedAt: value.updatedAt + 100 } : value,
  );
  const syncedItems = [
    ...items,
    item(`${prefix}-sync-a`, 6_000),
    item(`${prefix}-sync-b`, 6_001),
  ];

  return [
    {
      name: 'cold_start', items, recommendations, records: [], feedbackEvents,
      expected: { targets: 24, completed: 0, backlog: 24, skipped: 0, generated: 12 },
    },
    {
      name: 'unchanged', items, recommendations, records, feedbackEvents,
      expected: { targets: 24, completed: 24, backlog: 0, skipped: 24, generated: 12 },
    },
    {
      name: 'updated', items: updatedItems, recommendations, records, feedbackEvents,
      expected: { targets: 24, completed: 21, backlog: 3, skipped: 21, generated: 12 },
    },
    {
      name: 'deleted', items: items.slice(1), recommendations, records, feedbackEvents,
      expected: { targets: 23, completed: 23, backlog: 0, skipped: 23, generated: 11 },
    },
    {
      name: 'synced', items: syncedItems, recommendations, records, feedbackEvents,
      expected: { targets: 26, completed: 24, backlog: 2, skipped: 24, generated: 12 },
    },
  ];
}

export function assertScenarioQuality(
  scenario: ReceiptScenarioInput,
  quality: LivingGraphQualityMetrics,
): void {
  assert.deepEqual(
    {
      targets: quality.analysis.targetCount,
      completed: quality.analysis.completedCount,
      backlog: quality.analysis.backlogCount,
      skipped: quality.analysis.reanalysisSkippedCount,
      generated: quality.connections.generatedCount,
    },
    scenario.expected,
    `${scenario.name} Living Graph invariant failed`,
  );
}

export function fingerprintableScenarioInput(scenarios: ReceiptScenarioInput[]): unknown {
  return scenarios.map(({ name, items, recommendations, records }) => ({
    name,
    items: items.map(({ id, updatedAt }) => [id, updatedAt]),
    recommendations: recommendations.map(({ itemA_id, itemB_id, status }) => [
      itemA_id,
      itemB_id,
      status,
    ]),
    records: records.map(({ itemId, itemUpdatedAt, analyzerVersion, status }) => [
      itemId,
      itemUpdatedAt,
      analyzerVersion,
      status,
    ]),
  }));
}
