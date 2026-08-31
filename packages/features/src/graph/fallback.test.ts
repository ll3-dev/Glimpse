import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';
import {
  buildCompletedGraphAnalysisRecords,
  buildFailedGraphAnalysisRecords,
  materializeGraphRecommendations,
  proposeGraphEdgesByTagOverlap,
} from './fallback';

function item(id: string, tags: string[]): KnowledgeItem {
  return {
    id, type: 'note', title: id, body: null, url: null, summary: null, tags,
    createdAt: 1, updatedAt: 10, stability: null, difficulty: null,
    lastReviewedAt: null, nextReviewAt: null,
  };
}

function edge(id: string, left: string, right: string, status: Recommendation['status'] = 'pending'): Recommendation {
  return {
    id, itemA_id: left, itemB_id: right, reason: 'existing', status,
    createdAt: 1, respondedAt: null,
  };
}

describe('Living Graph deterministic fallback', () => {
  test('기존 verdict 상태와 무관하게 같은 pair를 재제안하지 않고 정렬이 결정론적이다', () => {
    const targets = [item('c', ['x', 'y']), item('a', ['x'])];
    const pool = [item('b', ['x', 'y']), item('d', ['x'])];
    const proposals = proposeGraphEdgesByTagOverlap(
      targets,
      pool,
      [edge('ignored', 'a', 'b', 'ignored')],
    );

    expect(proposals).toEqual([
      { itemAId: 'b', itemBId: 'c', reason: '공통 태그: x, y' },
      { itemAId: 'c', itemBId: 'd', reason: '공통 태그: x' },
      { itemAId: 'a', itemBId: 'd', reason: '공통 태그: x' },
    ]);
  });

  test('AI 제안도 canonical pair·dangling·self·중복을 제거해 Recommendation으로 만든다', () => {
    let nextId = 0;
    const recommendations = materializeGraphRecommendations(
      [
        { itemAId: 'b', itemBId: 'a', reason: 'first' },
        { itemAId: 'a', itemBId: 'b', reason: 'duplicate' },
        { itemAId: 'a', itemBId: 'a', reason: 'self' },
        { itemAId: 'a', itemBId: 'missing', reason: 'dangling' },
      ],
      [],
      [item('a', []), item('b', [])],
      { now: 100, createId: () => `id-${nextId++}` },
    );
    expect(recommendations).toEqual([
      {
        id: 'id-0', itemA_id: 'a', itemB_id: 'b', reason: 'first',
        status: 'pending', createdAt: 100, respondedAt: null,
      },
    ]);
  });

  test('completed는 incident edge 수를 기록하고 failed는 실패 횟수를 증가시킨다', () => {
    const items = [item('a', []), item('b', [])];
    expect(buildCompletedGraphAnalysisRecords(items, [edge('e', 'a', 'b')], 50, 'v1'))
      .toEqual([
        { itemId: 'a', itemUpdatedAt: 10, analyzerVersion: 'v1', analyzedAt: 50, edgeCount: 1, status: 'completed', failureCount: 0 },
        { itemId: 'b', itemUpdatedAt: 10, analyzerVersion: 'v1', analyzedAt: 50, edgeCount: 1, status: 'completed', failureCount: 0 },
      ]);
    expect(buildFailedGraphAnalysisRecords(items.slice(0, 1), [{
      itemId: 'a', itemUpdatedAt: 10, analyzerVersion: 'v1', analyzedAt: 40,
      edgeCount: 0, status: 'failed', failureCount: 2,
    }], 50, 'v1')[0].failureCount).toBe(3);
  });
});
