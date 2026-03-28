import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createGetPendingRecommendations,
  type GetPendingRecommendationsDeps,
} from '@/src/features/core/application/recommendation';

const coreClient = {
  listPendingRecommendations: mock(),
  listKnowledgeItemsByIds: mock(),
};

const deps = {
  coreClient,
} satisfies GetPendingRecommendationsDeps;

const getPendingRecommendations = createGetPendingRecommendations(deps);

describe('getPendingRecommendations', () => {
  beforeEach(() => {
    coreClient.listPendingRecommendations.mockReset();
    coreClient.listKnowledgeItemsByIds.mockReset();
  });

  test('returns empty list when there are no pending recommendations', async () => {
    coreClient.listPendingRecommendations.mockResolvedValue([]);
    coreClient.listKnowledgeItemsByIds.mockResolvedValue([]);

    const result = await getPendingRecommendations();

    expect(result).toEqual({ success: true, recommendations: [] });
    expect(coreClient.listPendingRecommendations).toHaveBeenCalledTimes(1);
  });

  test('joins pending recommendations with fetched items', async () => {
    const pending = [
      { id: 'r1', itemA_id: 'a', itemB_id: 'b', status: 'pending' },
      { id: 'r2', itemA_id: 'a', itemB_id: 'missing', status: 'pending' },
    ] as any;

    const items = [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ] as any;

    coreClient.listPendingRecommendations.mockResolvedValue(pending);
    coreClient.listKnowledgeItemsByIds.mockResolvedValue(items);

    const result = await getPendingRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0]?.recommendation.id).toBe('r1');
      expect(result.recommendations[0]?.itemA.id).toBe('a');
      expect(result.recommendations[0]?.itemB.id).toBe('b');
    }
    expect(coreClient.listKnowledgeItemsByIds).toHaveBeenCalledWith([
      'a',
      'b',
      'missing',
    ]);
  });

  test('returns error when query fails', async () => {
    coreClient.listPendingRecommendations.mockRejectedValue(new Error('db fail'));

    const result = await getPendingRecommendations();

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('RECOMMENDATION_ERROR');
    }
  });
});
