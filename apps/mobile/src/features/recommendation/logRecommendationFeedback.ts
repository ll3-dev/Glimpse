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
} from '@/src/features/core/application/recommendation';
import type { FeedbackActionType } from '@glimpse/shared';
import { generateId, isIdCollisionError, MAX_ID_COLLISION_RETRIES } from '@/src/lib/id';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

export type { FeedbackActionType };
const defaultDeps: RecommendationFeedbackDeps = {
  coreClient: mobileCoreClient as Pick<
    MobileCoreClient,
    'logRecommendationFeedback' | 'listRecentFeedbackEvents'
  >,
  nanoid: generateId,
  isIdCollisionError,
  maxIdCollisionRetries: MAX_ID_COLLISION_RETRIES,
};
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
export const logRecommendationFeedback = createLogRecommendationFeedback(defaultDeps);
export const getRecentFeedbackEvents = createGetRecentFeedbackEvents(defaultDeps);
