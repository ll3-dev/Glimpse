import { describe, expect, test } from 'bun:test';
import { connectedNotesForItem } from './getConnectedNotes';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

const edge = (a: string, b: string, reason: string | null = '테스트 근거'): Recommendation =>
  ({ id: `${a}-${b}`, itemA_id: a, itemB_id: b, reason, status: 'pending', createdAt: 1, respondedAt: null }) as Recommendation;

const item = (id: string, title: string): KnowledgeItem =>
  ({
    id,
    type: 'note',
    title,
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
  }) as KnowledgeItem;

describe('connectedNotesForItem', () => {
  const items = [item('a', 'A'), item('b', 'B'), item('c', 'C')];
  const edges = [edge('a', 'b'), edge('a', 'c')];

  test('a의 연결은 b와 c', () => {
    const result = connectedNotesForItem('a', edges, items);
    expect(result.map((note) => note.item.id).sort()).toEqual(['b', 'c']);
  });

  test('존재하지 않는(삭제된) 연결 대상 제외', () => {
    const dangling = [edge('a', 'd')];
    const result = connectedNotesForItem('a', [...edges, ...dangling], items);
    expect(result).toHaveLength(2);
  });

  test('연결 없으면 빈 배열', () => {
    expect(connectedNotesForItem('zzz', edges, items)).toEqual([]);
  });

  test('근거(reason)와 공통 태그가 함께 반환됨', () => {
    const tagged = [item('x', 'X'), item('y', 'Y')];
    tagged[0].tags = ['rust', 'sync'];
    tagged[1].tags = ['rust', 'misc'];
    const result = connectedNotesForItem('x', [edge('x', 'y', 'AI 근거')], tagged);
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('AI 근거');
    expect(result[0].sharedTags).toEqual(['rust']);
  });
});
