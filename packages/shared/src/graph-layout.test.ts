import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem, Recommendation } from './index';
import { layoutGraph } from './graph-layout';

function item(partial: Partial<KnowledgeItem> & { id: string }): KnowledgeItem {
  return {
    type: 'note', title: null, body: null, url: null, summary: null, tags: null,
    createdAt: 0, updatedAt: 0, stability: null, difficulty: null, lastReviewedAt: null,
    nextReviewAt: null, ...partial,
  };
}

function edge(partial: Partial<Recommendation> & { id: string; itemA_id: string; itemB_id: string }): Recommendation {
  return {
    reason: null, status: 'pending', createdAt: 0, respondedAt: null, ...partial,
  };
}

describe('layoutGraph', () => {
  test('연결된 항목을 우선하고 최대 36개로 제한한다', () => {
    const items = [
      item({ id: 'lonely', updatedAt: -999 }), // 가장 오래된 무연결 항목 — 컷에서 탈락
      ...Array.from({ length: 40 }, (_, i) => item({ id: `c${i}`, updatedAt: i })),
    ];
    const recommendations = [edge({ id: 'e0', itemA_id: 'c0', itemB_id: 'c1' })];
    const { nodes } = layoutGraph(items, recommendations);
    expect(nodes.length).toBe(36);
    // c0은 updatedAt이 0으로 낮아도 연결돼 있어 생존한다
    expect(nodes.some((n) => n.id === 'c0')).toBe(true);
    expect(nodes.some((n) => n.id === 'c1')).toBe(true);
    // 무연결 항목 중 updatedAt이 가장 낮은 lonely는 탈락한다
    expect(nodes.some((n) => n.id === 'lonely')).toBe(false);
  });

  test('pending·accepted 외 상태의 엣지는 제외한다', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' })];
    const recommendations = [
      edge({ id: 'e1', itemA_id: 'a', itemB_id: 'b', status: 'ignored' }),
      edge({ id: 'e2', itemA_id: 'a', itemB_id: 'b', status: 'dismissed' }),
    ];
    const { edges } = layoutGraph(items, recommendations);
    expect(edges).toEqual([]);
  });

  test('엔드포인트가 보이는 노드가 아닌 엣지는 버린다', () => {
    const items = [item({ id: 'a' })];
    const recommendations = [edge({ id: 'e1', itemA_id: 'a', itemB_id: 'ghost' })];
    const { edges } = layoutGraph(items, recommendations);
    expect(edges).toEqual([]);
  });

  test('라벨은 title → summary → Untitled 순으로 폴백한다', () => {
    const { nodes } = layoutGraph(
      [item({ id: 't', title: '제목' }), item({ id: 's', summary: '요약' }), item({ id: 'u' })],
      [],
    );
    const labels = Object.fromEntries(nodes.map((n) => [n.id, n.label]));
    expect(labels.t).toBe('제목');
    expect(labels.s).toBe('요약');
    expect(labels.u).toBe('Untitled');
  });

  test('노드는 타원 궤도에 배치되고 엣지는 노드 좌표를 공유한다', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' })];
    const recommendations = [edge({ id: 'e1', itemA_id: 'a', itemB_id: 'b', reason: '근거' })];
    const { nodes, edges } = layoutGraph(items, recommendations);
    expect(nodes).toHaveLength(2);
    expect(edges[0].source.id).toBe('a');
    expect(edges[0].target.id).toBe('b');
    expect(edges[0].reason).toBe('근거');
    for (const node of nodes) {
      expect(Math.hypot(node.x - 500, node.y - 330)).toBeGreaterThan(0);
    }
  });
});
