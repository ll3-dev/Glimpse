import {
  createGetRecentFeedbackEvents,
  createLogRecommendationFeedback,
  type GetRecentFeedbackResult,
  type LogFeedbackFailureResult,
  type LogFeedbackResult,
  type LogRecommendationFeedbackResult,
  type RecommendationFeedbackDeps,
  type RecentFeedbackFailureResult,
  type RecentFeedbackResult,
} from '@glimpse/features';
import type { FeedbackActionType } from '@glimpse/shared';
import { generateId, isIdCollisionError, MAX_ID_COLLISION_RETRIES } from '@/src/lib/id';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

export type { FeedbackActionType };

function getDefaultDeps(): RecommendationFeedbackDeps {
  return {
    coreClient: mobileCoreClient as Pick<
      MobileCoreClient,
      'logRecommendationFeedback' | 'listRecentFeedbackEvents'
    >,
    nanoid: generateId,
    isIdCollisionError,
    maxIdCollisionRetries: MAX_ID_COLLISION_RETRIES,
  };
}

export type {
  GetRecentFeedbackResult,
  LogFeedbackFailureResult,
  LogFeedbackResult,
  LogRecommendationFeedbackResult,
  RecommendationFeedbackDeps,
  RecentFeedbackFailureResult,
  RecentFeedbackResult,
};
export { createGetRecentFeedbackEvents, createLogRecommendationFeedback };
export function logRecommendationFeedback(
  event: Parameters<ReturnType<typeof createLogRecommendationFeedback>>[0]
) {
  return createLogRecommendationFeedback(getDefaultDeps())(event);
}

export function getRecentFeedbackEvents(limit?: number) {
  return createGetRecentFeedbackEvents(getDefaultDeps())(limit);
}
