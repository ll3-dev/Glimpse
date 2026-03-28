import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createSaveRecommendations,
  type SaveRecommendationsDeps,
} from '@/src/features/core/application/recommendation';
import type { GeneratedRecommendation } from '@/src/features/core/application/recommendation';

describe('createSaveRecommendations', () => {
  const coreClient = {
    saveRecommendations: mock<(recs: any[]) => Promise<void>>(),
  };
  const nanoid = mock(() => 'test-id-123');
  const isIdCollisionError = mock(() => false);

  const mockDeps = {
    coreClient,
    nanoid,
    isIdCollisionError,
    maxIdCollisionRetries: 3,
  } as unknown as SaveRecommendationsDeps;

  let saveRecommendations: ReturnType<typeof createSaveRecommendations>;

  beforeEach(() => {
    coreClient.saveRecommendations.mockReset();
    nanoid.mockClear();
    nanoid.mockReturnValue('test-id-123');
    isIdCollisionError.mockClear();
    isIdCollisionError.mockReturnValue(false);
    saveRecommendations = createSaveRecommendations(mockDeps);
  });

  test('returns success for empty recommendations list', async () => {
    const result = await saveRecommendations([]);

    expect(result.success).toBe(true);
    expect(coreClient.saveRecommendations).toHaveBeenCalledWith([]);
  });

  test('inserts recommendations with correct structure', async () => {
    const recommendationsList: GeneratedRecommendation[] = [
      {
        itemAId: 'item-1',
        itemBId: 'item-2',
        reason: 'Shared 2 tag(s)',
      },
    ];

    coreClient.saveRecommendations.mockResolvedValue(undefined);

    const result = await saveRecommendations(recommendationsList);

    expect(result.success).toBe(true);
    expect(coreClient.saveRecommendations).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'test-id-123',
          itemA_id: 'item-1',
          itemB_id: 'item-2',
          reason: 'Shared 2 tag(s)',
          status: 'pending',
        }),
      ])
    );
  });

  test('generates unique ID for each recommendation', async () => {
    const recommendationsList: GeneratedRecommendation[] = [
      { itemAId: 'item-1', itemBId: 'item-2', reason: 'reason 1' },
    ];

    nanoid.mockReturnValue('unique-id-123');
    coreClient.saveRecommendations.mockResolvedValue(undefined);

    await saveRecommendations(recommendationsList);

    expect(nanoid).toHaveBeenCalled();
    const saved = coreClient.saveRecommendations.mock.calls[0]?.[0] as { id: string }[];
    expect(saved[0].id).toBe('unique-id-123');
  });

  test('sets status to pending', async () => {
    const recommendationsList: GeneratedRecommendation[] = [
      { itemAId: 'item-1', itemBId: 'item-2', reason: 'reason' },
    ];

    coreClient.saveRecommendations.mockResolvedValue(undefined);

    await saveRecommendations(recommendationsList);

    const saved = coreClient.saveRecommendations.mock.calls[0]?.[0] as { status: string }[];
    expect(saved[0].status).toBe('pending');
  });

  test('returns error when insert fails', async () => {
    const recommendationsList: GeneratedRecommendation[] = [
      { itemAId: 'item-1', itemBId: 'item-2', reason: 'reason' },
    ];

    coreClient.saveRecommendations.mockRejectedValue(new Error('Insert failed'));

    const result = await saveRecommendations(recommendationsList);

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error.code).toBe('RECOMMENDATION_ERROR');
    }
  });

  test('handles multiple recommendations', async () => {
    const recommendationsList: GeneratedRecommendation[] = [
      { itemAId: 'item-1', itemBId: 'item-2', reason: 'reason 1' },
      { itemAId: 'item-1', itemBId: 'item-3', reason: 'reason 2' },
    ];

    coreClient.saveRecommendations.mockResolvedValue(undefined);

    const result = await saveRecommendations(recommendationsList);

    expect(result.success).toBe(true);
    const saved = coreClient.saveRecommendations.mock.calls[0]?.[0] as unknown[];
    expect(saved.length).toBe(2);
  });
});
