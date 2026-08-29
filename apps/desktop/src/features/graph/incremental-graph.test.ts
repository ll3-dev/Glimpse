import { describe, expect, test } from 'bun:test';
import { planIncrementalCycle, MAX_BATCH_PER_CYCLE, RECHECK_LIMIT } from './incremental-graph';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

const item = (id: string, overrides: Partial<KnowledgeItem> = {}): KnowledgeItem =>
  ({
    id,
    type: 'note',
    title: `title-${id}`,
    body: null,
    url: null,
    summary: null,
    tags: [],
    createdAt: 0,
    updatedAt: 1,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    ...overrides,
  }) as KnowledgeItem;

const edge = (itemA: string, itemB: string, createdAt: number): Recommendation =>
  ({
    id: `${itemA}-${itemB}`,
    itemA_id: itemA,
    itemB_id: itemB,
    reason: null,
    status: 'pending',
    createdAt,
    respondedAt: null,
  }) as Recommendation;

describe('planIncrementalCycle', () => {
  test('엣지가 없는 아이템은 toAnalyze(백로그)로 분류', () => {
    const plan = planIncrementalCycle([item('a'), item('b')], []);
    expect(plan.toAnalyze.map((entry) => entry.id).sort()).toEqual(['a', 'b']);
    expect(plan.analyzedPool).toEqual([]);
  });

  test('엣지가 있고 수정되지 않은 아이템은 analyzed 풀로', () => {
    const plan = planIncrementalCycle([item('a', { updatedAt: 100 })], [edge('a', 'b', 200)]);
    expect(plan.analyzedPool.map((entry) => entry.id)).toEqual(['a']);
    expect(plan.toAnalyze).toEqual([]);
  });

  test('엣지 이후 수정된 아이템은 stale → toAnalyze', () => {
    const plan = planIncrementalCycle(
      [item('a', { updatedAt: 300 }), item('b', { updatedAt: 100 })],
      [edge('a', 'b', 200)],
    );
    expect(plan.toAnalyze.map((entry) => entry.id)).toEqual(['a']);
    expect(plan.analyzedPool.map((entry) => entry.id)).toEqual(['b']);
  });

  test('배치 상한 8개 — 백로그는 최신 우선으로 잘림', () => {
    const items = Array.from({ length: 20 }, (_, index) =>
      item(`i${index}`, { updatedAt: index + 1 }),
    );
    const plan = planIncrementalCycle(items, []);
    expect(plan.toAnalyze).toHaveLength(MAX_BATCH_PER_CYCLE);
    expect(plan.toAnalyze[0].id).toBe('i19');
    expect(plan.toAnalyze[MAX_BATCH_PER_CYCLE - 1].id).toBe('i12');
  });

  test('콜드스타트 — 엣지 0개면 전체가 백로그, 최신부터 배치', () => {
    const items = Array.from({ length: 40 }, (_, index) =>
      item(`c${index}`, { updatedAt: index + 1 }),
    );
    const plan = planIncrementalCycle(items, []);
    // 배치 상한 8개씩 여러 사이클에 걸쳐 소진 — 최신 8개부터
    expect(plan.toAnalyze).toHaveLength(MAX_BATCH_PER_CYCLE);
    expect(plan.toAnalyze[0].id).toBe('c39');
  });

  test('RECHECK_LIMIT 상수는 20 (재검증 후보 상한)', () => {
    expect(RECHECK_LIMIT).toBe(20);
  });
});
