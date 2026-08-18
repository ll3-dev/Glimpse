import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createRespondToRecommendation,
  type RespondToRecommendationDeps,
} from '@/src/features/core/application/recommendation';

const createMockDeps = () => {
  const coreClient = {
    respondToRecommendation: mock(),
  };
  const nanoid = mock(() => 'event-1');
  const isIdCollisionError = mock(() => false);

  return {
    coreClient,
    nanoid,
    isIdCollisionError,
    maxIdCollisionRetries: 3,
  } as unknown as RespondToRecommendationDeps;
};

describe('respondToRecommendation', () => {
  let deps: RespondToRecommendationDeps;
  let respondToRecommendation: ReturnType<typeof createRespondToRecommendation>;

  beforeEach(() => {
    deps = createMockDeps();
    respondToRecommendation = createRespondToRecommendation(deps);
  });

  test('maps accept action to accepted status and persists feedback', async () => {
    deps.coreClient.respondToRecommendation = mock(async () => {});

    const result = await respondToRecommendation('rec-1', 'accepted', 'accept');

    expect(result).toEqual({ success: true, recommendationId: 'rec-1' });
    expect(deps.coreClient.respondToRecommendation).toHaveBeenCalledWith(
      'rec-1',
      'accepted',
      expect.objectContaining({
        id: 'event-1',
        recommendationId: 'rec-1',
        action: 'accept',
      })
    );
  });

  test('maps ignore and dismiss actions correctly', async () => {
    deps.coreClient.respondToRecommendation = mock(async () => {});

    const ignored = await respondToRecommendation('rec-2', 'ignored', 'ignore');
    const dismissed = await respondToRecommendation('rec-3', 'dismissed', 'dismiss');

    expect(ignored).toEqual({ success: true, recommendationId: 'rec-2' });
    expect(dismissed).toEqual({ success: true, recommendationId: 'rec-3' });
  });

  test('returns error on failure', async () => {
    deps.coreClient.respondToRecommendation = mock(async () => {
      throw new Error('batch failed');
    });

    const result = await respondToRecommendation('rec-4', 'accepted', 'accept');

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('RECOMMENDATION_ERROR');
    }
  });
});
