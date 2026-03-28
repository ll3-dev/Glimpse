import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';
import {
  buildFeedbackEvent,
  buildLogFeedbackEvent,
  buildRecommendationReason,
  buildRecommendationRecord,
  collectPendingRecommendationItemIds,
  countSharedTags,
  joinRecommendationsWithItems,
  toAppError,
  toTagOverlapInput,
} from './helpers';

function createItem(id: string, tags: string[] | null): KnowledgeItem {
  return {
    id,
    type: 'note',
    title: id,
    body: null,
    url: null,
    summary: null,
    tags,
    labels: null,
    provisionalLabels: null,
    labelStatus: null,
    labelSource: null,
    labelVersion: null,
    labelScore: null,
    labelRequestedAt: null,
    labelCompletedAt: null,
    labelError: null,
    createdAt: 1,
    updatedAt: 1,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
  };
}

describe('recommendation helpers', () => {
  test('toAppError preserves error message and fallback code', () => {
    expect(toAppError(new Error('boom'))).toEqual({
      code: 'RECOMMENDATION_ERROR',
      message: 'boom',
    });
    expect(toAppError('oops', 'CUSTOM')).toEqual({
      code: 'CUSTOM',
      message: 'oops',
    });
  });

  test('countSharedTags deduplicates repeated tags before counting overlap', () => {
    const left = createItem('left', ['a', 'a', 'b']);
    const right = createItem('right', ['b', 'b', 'c']);
    expect(countSharedTags(left, right)).toBe(1);
  });

  test('build helper records shape recommendation and feedback payloads', () => {
    expect(buildRecommendationReason(2)).toBe('Shared 2 tag(s)');
    expect(
      buildRecommendationRecord(
        { itemAId: 'a', itemBId: 'b', reason: 'Shared 1 tag(s)' },
        'rec-1',
        100
      )
    ).toEqual({
      id: 'rec-1',
      itemA_id: 'a',
      itemB_id: 'b',
      reason: 'Shared 1 tag(s)',
      status: 'pending',
      createdAt: 100,
      respondedAt: null,
    });
    expect(buildFeedbackEvent('rec-1', 'accept', 'event-1', 200)).toEqual({
      id: 'event-1',
      recommendationId: 'rec-1',
      action: 'accept',
      createdAt: 200,
    });
    expect(
      buildLogFeedbackEvent({ recommendationId: 'rec-1', action: 'dismiss' }, 'event-2', 300)
    ).toEqual({
      id: 'event-2',
      recommendationId: 'rec-1',
      action: 'dismiss',
      createdAt: 300,
    });
  });

  test('collectPendingRecommendationItemIds de-duplicates ids in insertion order', () => {
    const recommendations: Recommendation[] = [
      {
        id: 'rec-1',
        itemA_id: 'a',
        itemB_id: 'b',
        reason: null,
        status: 'pending',
        createdAt: 1,
        respondedAt: null,
      },
      {
        id: 'rec-2',
        itemA_id: 'b',
        itemB_id: 'c',
        reason: null,
        status: 'pending',
        createdAt: 2,
        respondedAt: null,
      },
    ];

    expect(collectPendingRecommendationItemIds(recommendations)).toEqual(['a', 'b', 'c']);
  });

  test('joinRecommendationsWithItems keeps only fully joined pairs', () => {
    const recommendations: Recommendation[] = [
      {
        id: 'rec-1',
        itemA_id: 'a',
        itemB_id: 'b',
        reason: null,
        status: 'pending',
        createdAt: 1,
        respondedAt: null,
      },
      {
        id: 'rec-2',
        itemA_id: 'a',
        itemB_id: 'missing',
        reason: null,
        status: 'pending',
        createdAt: 2,
        respondedAt: null,
      },
    ];
    const items = [createItem('a', ['x']), createItem('b', ['y'])];

    expect(joinRecommendationsWithItems(recommendations, items)).toEqual([
      {
        recommendation: recommendations[0],
        itemA: items[0],
        itemB: items[1],
      },
    ]);
  });

  test('toTagOverlapInput preserves nullable tags', () => {
    expect(toTagOverlapInput(createItem('a', null), createItem('b', ['x']))).toEqual({
      left: { tags: null },
      right: { tags: ['x'] },
    });
  });
});
