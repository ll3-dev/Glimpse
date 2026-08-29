import { describe, expect, it } from 'bun:test';
import { selectRecentEdges } from './recent-edges';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

const baseItem = (
  id: string,
  title: string | null,
  overrides: Partial<KnowledgeItem> = {},
): KnowledgeItem => ({
  id,
  type: 'note',
  title,
  body: null,
  url: null,
  summary: null,
  tags: null,
  createdAt: 0,
  updatedAt: 0,
  stability: null,
  difficulty: null,
  lastReviewedAt: null,
  nextReviewAt: null,
  ...overrides,
});

const edge = (
  id: string,
  itemA_id: string,
  itemB_id: string,
  overrides: Partial<Recommendation> = {},
): Recommendation => ({
  id,
  itemA_id,
  itemB_id,
  reason: null,
  status: 'accepted',
  createdAt: 0,
  respondedAt: null,
  ...overrides,
});

describe('selectRecentEdges', () => {
  it('최신 3개만, 양끝 아이템 제목을 매핑해 돌려준다', () => {
    const edges = [
      edge('e1', 'a', 'b'),
      edge('e2', 'c', 'd'),
      edge('e3', 'e', 'f'),
      edge('e4', 'g', 'h'),
    ];
    const items = 'abcdefgh'
      .split('')
      .map((id) => baseItem(id, `${id}-제목`));

    const result = selectRecentEdges(edges, items, 3);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ edgeId: 'e1', titleA: 'a-제목', titleB: 'b-제목' });
  });

  it('한쪽 아이템이 삭제된 엣지는 건너뛴다', () => {
    const edges = [edge('e1', 'gone', 'b'), edge('e2', 'a', 'b')];
    const items = [baseItem('a', 'a-제목'), baseItem('b', 'b-제목')];

    const result = selectRecentEdges(edges, items, 3);

    expect(result).toHaveLength(1);
    expect(result[0]?.edgeId).toBe('e2');
  });

  it('상태 관계없이 전달된 엣지를 그대로 처리한다', () => {
    // 상태 필터(pending 제외 등)는 호출부(digest.tsx)의 책임이다.
    const edges = [{ ...edge('e1', 'a', 'b'), status: 'pending' as const }];
    const items = [baseItem('a', 'a-제목'), baseItem('b', 'b-제목')];

    const result = selectRecentEdges(edges, items, 3);

    expect(result).toHaveLength(1);
  });
});
