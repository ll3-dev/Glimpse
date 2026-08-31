import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';
import { selectTodayDiscoveries } from './discovery';

function item(id: string): KnowledgeItem {
  return {
    id, type: 'note', title: id, body: null, url: null, summary: null, tags: null,
    createdAt: 1, updatedAt: 1, stability: null, difficulty: null,
    lastReviewedAt: null, nextReviewAt: null,
  };
}

function edge(
  id: string,
  itemA_id: string,
  itemB_id: string,
  partial: Partial<Recommendation> = {},
): Recommendation {
  return {
    id, itemA_id, itemB_id, reason: null, status: 'pending',
    createdAt: 1, respondedAt: null, ...partial,
  };
}

describe('selectTodayDiscoveries', () => {
  test('유효 endpoint의 pending만 우선하고 근거가 있는 최신 연결부터 고른다', () => {
    const items = [item('a'), item('b'), item('c')];
    const discoveries = selectTodayDiscoveries(items, [
      edge('accepted', 'a', 'b', { status: 'accepted', createdAt: 100 }),
      edge('no-reason', 'a', 'c', { createdAt: 90 }),
      edge('reason-old', 'a', 'b', { reason: '공통 주제', createdAt: 20 }),
      edge('reason-new', 'b', 'c', { reason: '같은 문제', createdAt: 30 }),
      edge('dangling', 'a', 'ghost', { reason: '무효', createdAt: 999 }),
    ]);

    expect(discoveries.map(({ recommendation }) => recommendation.id)).toEqual([
      'reason-new',
      'reason-old',
      'no-reason',
    ]);
    expect(discoveries.every(({ kind }) => kind === 'new')).toBe(true);
    expect(discoveries[0].itemA.id).toBe('b');
    expect(discoveries[0].itemB.id).toBe('c');
  });

  test('pending이 없으면 최근 accepted를 안정적인 id tie-break로 보여준다', () => {
    const items = [item('a'), item('b'), item('c')];
    const discoveries = selectTodayDiscoveries(items, [
      edge('z', 'a', 'b', { status: 'accepted', createdAt: 10, respondedAt: 50 }),
      edge('a', 'b', 'c', { status: 'accepted', createdAt: 20, respondedAt: 50 }),
      edge('ignored', 'a', 'c', { status: 'ignored', createdAt: 100 }),
    ], 1);

    expect(discoveries).toHaveLength(1);
    expect(discoveries[0].recommendation.id).toBe('a');
    expect(discoveries[0].kind).toBe('recent');
  });
});
