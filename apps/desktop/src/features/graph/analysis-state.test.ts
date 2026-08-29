import { describe, expect, it } from 'bun:test';
import { classifyItem } from './analysis-state';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

const baseItem = (overrides: Partial<KnowledgeItem>): KnowledgeItem =>
  ({ id: 'x', title: 't', body: null, summary: null, tags: [], createdAt: 0, updatedAt: 0, deletedAt: null, ...overrides }) as KnowledgeItem;

const edge = (itemA: string, itemB: string, createdAt: number): Recommendation =>
  ({ id: `${itemA}-${itemB}`, itemA_id: itemA, itemB_id: itemB, reason: null, status: 'pending', createdAt, respondedAt: null }) as Recommendation;

describe('classifyItem', () => {
  it('엣지가 없으면 unanalyzed', () => {
    expect(classifyItem(baseItem({ id: 'a' }), [])).toBe('unanalyzed');
  });

  it('엣지가 있고 updatedAt <= 최근분석시각이면 analyzed', () => {
    // 최근분석시각 = 해당 아이템이 참여한 엣지 중 최신 createdAt
    expect(classifyItem(baseItem({ id: 'a', updatedAt: 100 }), [edge('a', 'b', 200)])).toBe('analyzed');
  });

  it('엣지 이후 수정되면 stale', () => {
    expect(classifyItem(baseItem({ id: 'a', updatedAt: 300 }), [edge('a', 'b', 200)])).toBe('stale');
  });
});
