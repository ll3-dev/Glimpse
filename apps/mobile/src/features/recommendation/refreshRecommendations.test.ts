import { describe, expect, mock, test } from 'bun:test';
import type { Recommendation } from '@glimpse/shared';
import {
  createRefreshRecommendations,
  filterNewRecommendations,
  isRecommendationRefreshDue,
  type RecommendationRefreshDeps,
} from './refreshRecommendations';

const existingRecommendation = (itemAId: string, itemBId: string): Recommendation => ({
  id: `${itemAId}-${itemBId}`,
  itemA_id: itemAId,
  itemB_id: itemBId,
  reason: null,
  status: 'pending',
  createdAt: 1,
  respondedAt: null,
});

describe('refreshRecommendations', () => {
  test('treats reverse item order as the same recommendation pair', () => {
    const filtered = filterNewRecommendations(
      [
        { itemAId: 'b', itemBId: 'a', reason: 'duplicate' },
        { itemAId: 'a', itemBId: 'c', reason: 'new' },
        { itemAId: 'c', itemBId: 'a', reason: 'same new pair' },
      ],
      [existingRecommendation('a', 'b')]
    );

    expect(filtered).toEqual([{ itemAId: 'a', itemBId: 'c', reason: 'new' }]);
  });

  test('uses cadence to decide when a refresh is due', () => {
    expect(isRecommendationRefreshDue(100, null, 50)).toBe(true);
    expect(isRecommendationRefreshDue(149, 100, 50)).toBe(false);
    expect(isRecommendationRefreshDue(150, 100, 50)).toBe(true);
  });

  test('generates, deduplicates, saves, and records a successful refresh', async () => {
    const setLastRefreshAt = mock(() => undefined);
    const save = mock(async () => ({ success: true } as const));
    const deps: RecommendationRefreshDeps = {
      now: () => 1_000,
      getCadence: () => 100,
      getLastRefreshAt: () => null,
      setLastRefreshAt,
      listRecommendations: async () => [existingRecommendation('a', 'b')],
      generate: async () => ({
        success: true,
        recommendations: [
          { itemAId: 'b', itemBId: 'a', reason: 'old' },
          { itemAId: 'a', itemBId: 'c', reason: 'new' },
        ],
      }),
      save,
    };

    const result = await createRefreshRecommendations(deps)();

    expect(result).toEqual({
      success: true,
      skipped: false,
      createdCount: 1,
      generatedCount: 2,
    });
    expect(save).toHaveBeenCalledWith([
      { itemAId: 'a', itemBId: 'c', reason: 'new' },
    ]);
    expect(setLastRefreshAt).toHaveBeenCalledWith(1_000);
  });

  test('does not advance the schedule when saving fails', async () => {
    const setLastRefreshAt = mock(() => undefined);
    const deps: RecommendationRefreshDeps = {
      now: () => 1_000,
      getCadence: () => 100,
      getLastRefreshAt: () => null,
      setLastRefreshAt,
      listRecommendations: async () => [],
      generate: async () => ({
        success: true,
        recommendations: [{ itemAId: 'a', itemBId: 'b', reason: 'new' }],
      }),
      save: async () => ({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'failed' },
      }),
    };

    const result = await createRefreshRecommendations(deps)();

    expect(result.success).toBe(false);
    expect(setLastRefreshAt).not.toHaveBeenCalled();
  });
});
