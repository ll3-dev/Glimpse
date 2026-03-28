import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createGetRecentFeedbackEvents,
  createLogRecommendationFeedback,
  type RecommendationFeedbackDeps,
} from '@/src/features/core/application/recommendation';
import type { FeedbackEvent } from '@glimpse/shared';

const createMockDeps = () => {
  const coreClient = {
    logRecommendationFeedback: mock<(event: FeedbackEvent) => Promise<FeedbackEvent>>(),
    listRecentFeedbackEvents: mock<(limit: number) => Promise<FeedbackEvent[]>>(),
  };
  const nanoid = mock(() => 'feedback-id');
  const isIdCollisionError = mock(() => false);

  return {
    coreClient,
    nanoid,
    isIdCollisionError,
    maxIdCollisionRetries: 3,
  } as unknown as RecommendationFeedbackDeps;
};

describe('logRecommendationFeedback', () => {
  let deps: RecommendationFeedbackDeps;
  let logRecommendationFeedback: ReturnType<typeof createLogRecommendationFeedback>;
  let getRecentFeedbackEvents: ReturnType<typeof createGetRecentFeedbackEvents>;

  beforeEach(() => {
    deps = createMockDeps();
    logRecommendationFeedback = createLogRecommendationFeedback(deps);
    getRecentFeedbackEvents = createGetRecentFeedbackEvents(deps);
  });

  test('writes feedback event and returns it', async () => {
    const savedEvent: FeedbackEvent = {
      id: 'feedback-id',
      recommendationId: 'rec-1',
      action: 'accept',
      createdAt: Date.now(),
    };
    deps.coreClient.logRecommendationFeedback = mock(async () => savedEvent);

    const result = await logRecommendationFeedback({
      recommendationId: 'rec-1',
      action: 'accept',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.event.id).toBe('feedback-id');
      expect(result.event.recommendationId).toBe('rec-1');
      expect(result.event.action).toBe('accept');
    }
    expect(deps.coreClient.logRecommendationFeedback).toHaveBeenCalledTimes(1);
  });

  test('returns error when insert fails', async () => {
    deps.coreClient.logRecommendationFeedback = mock(async () => {
      throw new Error('insert failed');
    });

    const result = await logRecommendationFeedback({
      recommendationId: 'rec-2',
      action: 'ignore',
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('RECOMMENDATION_ERROR');
    }
  });

  test('returns recent feedback events with limit', async () => {
    const events = [{ id: 'e1' }, { id: 'e2' }] as FeedbackEvent[];
    deps.coreClient.listRecentFeedbackEvents = mock(async () => events);

    const result = await getRecentFeedbackEvents(2);

    expect(result).toEqual({ success: true, events });
    expect(deps.coreClient.listRecentFeedbackEvents).toHaveBeenCalledWith(2);
  });

  test('returns error when reading recent events fails', async () => {
    deps.coreClient.listRecentFeedbackEvents = mock(async () => {
      throw new Error('read failed');
    });

    const result = await getRecentFeedbackEvents();

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('RECOMMENDATION_ERROR');
    }
  });
});
