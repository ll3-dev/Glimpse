import { describe, expect, it } from 'bun:test';
import { countEdges, sortDueItemsByEdgePriority } from './edgePriority';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

function item(overrides: Partial<KnowledgeItem>): KnowledgeItem {
  return {
    id: 'x', type: 'note', title: null, body: null, url: null, summary: null,
    tags: null, labels: null, provisionalLabels: null, labelStatus: null,
    labelSource: null, labelVersion: null, labelScore: null, labelRequestedAt: null,
    labelCompletedAt: null, labelError: null, createdAt: 0, updatedAt: 0,
    stability: null, difficulty: null, lastReviewedAt: null, nextReviewAt: null,
    ...overrides,
  };
}

function edge(id: string, itemA_id: string, itemB_id: string): Recommendation {
  return { id, itemA_id, itemB_id, reason: null, status: 'accepted', createdAt: 0, respondedAt: null };
}

describe('countEdges', () => {
  it('itemA_id/itemB_id 양쪽을 아이템별 엣지 수로 센다', () => {
    const counts = countEdges([edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'a', 'b')]);
    expect(counts.get('b')).toBe(3);
    expect(counts.get('a')).toBe(2);
    expect(counts.get('c')).toBe(1);
    expect(counts.get('없음')).toBeUndefined();
  });
});

describe('sortDueItemsByEdgePriority', () => {
  const T0 = 1_000;

  it('시각 1차(오름차순), 같은 시각이면 연결도 2차, 그래도 같으면 입력 순서', () => {
    const items = [
      item({ id: 'b', nextReviewAt: T0 }),
      item({ id: 'a', nextReviewAt: T0 }),
      item({ id: 'c', nextReviewAt: T0 + 1 }),
    ];
    const sorted = sortDueItemsByEdgePriority(items, [edge('e1', 'a', 'b'), edge('e2', 'a', 'c')]);
    expect(sorted.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('엣지가 없으면 입력 순서를 그대로 유지(기존 동작 무변경)', () => {
    const items = [item({ id: 'b', nextReviewAt: T0 }), item({ id: 'a', nextReviewAt: T0 })];
    const sorted = sortDueItemsByEdgePriority(items, []);
    expect(sorted.map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('cap이 부스트를 제한해도 0이 되진 않음 — cap 넘은 항목이 무엣지 항목을 이긴다', () => {
    // a: 원래 엣지 10개, cap 3 → 부스트 3w > b: 0. 동률이 아니므로 b가 먼저여도 a가 역전.
    const edges = Array.from({ length: 10 }, (_, i) => edge(`e${i}`, 'a', `x${i}`));
    const items = [item({ id: 'b', nextReviewAt: T0 }), item({ id: 'a', nextReviewAt: T0 })];
    const sorted = sortDueItemsByEdgePriority(items, edges, { cap: 3 });
    expect(sorted.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('둘 다 cap 초과면 부스트 동률 — 원래 엣지 수 무시하고 입력 순서 유지', () => {
    // a: 10엣지, b: 7엣지, cap 3 → 둘 다 3w 동률. cap이 없었다면 a(10w)가 이겼을 것.
    const edges = [
      ...Array.from({ length: 10 }, (_, i) => edge(`a${i}`, 'a', `x${i}`)),
      ...Array.from({ length: 7 }, (_, i) => edge(`b${i}`, 'b', `y${i}`)),
    ];
    const items = [item({ id: 'b', nextReviewAt: T0 }), item({ id: 'a', nextReviewAt: T0 })];
    const sorted = sortDueItemsByEdgePriority(items, edges, { cap: 3 });
    expect(sorted.map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('nextReviewAt가 null인 항목은 시각 있는 항목보다 먼저(SQL NULLs-first ASC)', () => {
    const items = [item({ id: 'x', nextReviewAt: T0 }), item({ id: 'n', nextReviewAt: null })];
    const sorted = sortDueItemsByEdgePriority(items, [edge('e1', 'x', 'n')]);
    expect(sorted.map((i) => i.id)).toEqual(['n', 'x']);
  });
});
