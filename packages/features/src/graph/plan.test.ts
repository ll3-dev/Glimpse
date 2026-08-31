import { describe, expect, test } from 'bun:test';
import type { GraphAnalysisRecord, KnowledgeItem } from '@glimpse/shared';
import {
  LIVING_GRAPH_ANALYZER_VERSION,
  planLivingGraphCycle,
} from './plan';

function item(id: string, updatedAt: number): KnowledgeItem {
  return {
    id, type: 'note', title: id, body: null, url: null, summary: null, tags: null,
    createdAt: 1, updatedAt, stability: null, difficulty: null,
    lastReviewedAt: null, nextReviewAt: null,
  };
}

function completed(itemId: string, itemUpdatedAt: number, version = LIVING_GRAPH_ANALYZER_VERSION): GraphAnalysisRecord {
  return {
    itemId, itemUpdatedAt, analyzerVersion: version, analyzedAt: 1_000,
    edgeCount: 0, status: 'completed', failureCount: 0,
  };
}

describe('planLivingGraphCycle', () => {
  test('0-edge completed는 clean이고 수정·버전 변경 항목만 dirty다', () => {
    const items = [item('clean', 10), item('edited', 20), item('old-version', 10)];
    const plan = planLivingGraphCycle(
      items,
      [completed('clean', 10), completed('edited', 10), completed('old-version', 10, 'v0')],
      { now: 2_000 },
    );

    expect(plan.toAnalyze.map(({ id }) => id)).toEqual(['edited', 'old-version']);
    expect(plan.analyzedPool.map(({ id }) => id)).toEqual(['clean']);
    expect(plan.skippedCount).toBe(1);
  });

  test('최신 항목부터 batch limit만 처리하고 잔여 backlog를 센다', () => {
    const items = Array.from({ length: 10 }, (_, index) => item(`i${index}`, index));
    const plan = planLivingGraphCycle(items, [], { now: 10_000, batchLimit: 3 });
    expect(plan.toAnalyze.map(({ id }) => id)).toEqual(['i9', 'i8', 'i7']);
    expect(plan.backlogTotal).toBe(10);
    expect(plan.remainingBacklog).toBe(7);
  });

  test('failed는 backoff 뒤 재시도하고 3회 실패 뒤 자동 처리에서 제외한다', () => {
    const failed = (itemId: string, failureCount: number, analyzedAt: number): GraphAnalysisRecord => ({
      ...completed(itemId, 10), status: 'failed', failureCount, analyzedAt,
    });
    const items = [item('waiting', 10), item('retry', 10), item('blocked', 10)];
    const plan = planLivingGraphCycle(
      items,
      [failed('waiting', 1, 95_000), failed('retry', 1, 1_000), failed('blocked', 3, 1_000)],
      { now: 100_000 },
    );
    expect(plan.toAnalyze.map(({ id }) => id)).toEqual(['retry']);
    expect(plan.deferredTotal).toBe(2);
  });
});
