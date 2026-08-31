import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';
import { mergeProposedEdges } from './edge-merge';

function item(id: string): KnowledgeItem {
  return {
    id,
    type: 'note',
    title: id,
    body: null,
    url: null,
    summary: null,
    tags: null,
    createdAt: 1,
    updatedAt: 1,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
  };
}

function edge(itemAId: string, itemBId: string): Recommendation {
  return {
    id: 'existing',
    itemA_id: itemAId,
    itemB_id: itemBId,
    reason: 'existing',
    status: 'pending',
    createdAt: 1,
    respondedAt: null,
  };
}

describe('mergeProposedEdges', () => {
  test('기존 정방향 쌍의 역순 제안을 같은 연결로 취급한다', () => {
    const additions = mergeProposedEdges(
      [{ itemAId: 'b', itemBId: 'a', reason: 'reverse' }],
      [edge('a', 'b')],
      [item('a'), item('b')],
    );

    expect(additions).toEqual([]);
  });
});
