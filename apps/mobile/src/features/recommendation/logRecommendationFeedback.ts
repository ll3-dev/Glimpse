/**
 * Log Recommendation Feedback Use Case
 *
 * Logs user feedback events to recommendations for analytics and learning.
 */

import { Effect } from 'effect';
import { generateId, isIdCollisionError, MAX_ID_COLLISION_RETRIES } from '@/src/lib/id';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import {
  appError,
  type AppError,
  isFailure,
  runEffectSuccess,
} from '@/src/lib/effect-result';
import type { FeedbackActionType, FeedbackEvent, NewFeedbackEvent } from '@glimpse/shared';

export type { FeedbackActionType };

export interface LogFeedbackResult {
  success: true;
  event: FeedbackEvent;
}

export interface LogFeedbackFailureResult {
  success: false;
  error: AppError;
}

export type LogRecommendationFeedbackResult = LogFeedbackResult | LogFeedbackFailureResult;

export interface RecentFeedbackResult {
  success: true;
  data: FeedbackEvent[];
}

export interface RecentFeedbackFailureResult {
  success: false;
  error: AppError;
}

export type GetRecentFeedbackResult = RecentFeedbackResult | RecentFeedbackFailureResult;

export interface RecommendationFeedbackDeps {
  coreClient: Pick<MobileCoreClient, 'logRecommendationFeedback' | 'listRecentFeedbackEvents'>;
  nanoid: () => string;
}

const defaultDeps: RecommendationFeedbackDeps = {
  coreClient: mobileCoreClient,
  nanoid: generateId,
};

/**
 * Retrieves recent feedback events, ordered by creation date (newest first).
 */
export function createLogRecommendationFeedback(deps: RecommendationFeedbackDeps = defaultDeps) {
  return async function logRecommendationFeedback(
    recommendationId: string,
    action: FeedbackActionType
  ): Promise<LogRecommendationFeedbackResult> {
    for (let attempt = 0; attempt <= MAX_ID_COLLISION_RETRIES; attempt++) {
      const now = Date.now();
      const newEvent: NewFeedbackEvent = {
        id: deps.nanoid(),
        recommendationId,
        action,
        createdAt: now,
      };

      const insertResult = await runEffectSuccess(
        Effect.tryPromise({
          try: () => deps.coreClient.logRecommendationFeedback(newEvent),
          catch: (error) =>
            appError('DATABASE_ERROR', 'Failed to log feedback event', error),
        }).pipe(
          Effect.map((event) => ({
            success: true as const,
            event,
          }))
        )
      );

      if (!isFailure(insertResult)) {
        return insertResult;
      }

      const isFinalAttempt = attempt === MAX_ID_COLLISION_RETRIES;
      if (!isIdCollisionError(insertResult.error.details) || isFinalAttempt) {
        return {
          success: false,
          error: insertResult.error,
        };
      }
    }

    return {
      success: false,
      error: appError('DATABASE_ERROR', 'Failed to log feedback event after ID collision retries'),
    };
  };
}

export function createGetRecentFeedbackEvents(deps: RecommendationFeedbackDeps = defaultDeps) {
  return async function getRecentFeedbackEvents(
    limit: number = 50
  ): Promise<GetRecentFeedbackResult> {
    const program = Effect.gen(function* () {
      const events = (yield* Effect.tryPromise({
        try: () => deps.coreClient.listRecentFeedbackEvents(limit),
        catch: (error) =>
          appError('DATABASE_ERROR', 'Failed to retrieve feedback events', error),
      })) as FeedbackEvent[];

      return {
        success: true as const,
        data: events,
      };
    });

    const result = await runEffectSuccess(program);
    if (isFailure(result)) {
      return {
        success: false,
        error: result.error,
      };
    }

    return result;
  };
}

export const logRecommendationFeedback = createLogRecommendationFeedback();
export const getRecentFeedbackEvents = createGetRecentFeedbackEvents();
