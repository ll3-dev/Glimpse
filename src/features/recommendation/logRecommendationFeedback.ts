/**
 * Log Recommendation Feedback Use Case
 *
 * Logs user feedback events to recommendations for analytics and learning.
 */

import { nanoid } from 'nanoid';
import { db, feedbackEvents, type FeedbackEvent, type NewFeedbackEvent, type FeedbackActionType } from '@/src/db';
import { desc } from 'drizzle-orm';
import { Effect } from 'effect';
import {
  appError,
  isFailure,
  type AppError,
  runEffectSuccess,
  tryPromise,
} from '@/src/lib/effect-result';

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
  db: typeof db;
  feedbackEvents: typeof feedbackEvents;
  desc: typeof desc;
  nanoid: typeof nanoid;
}

const defaultDeps: RecommendationFeedbackDeps = {
  db,
  feedbackEvents,
  desc,
  nanoid,
};

/**
 * Retrieves recent feedback events, ordered by creation date (newest first).
 */
export function createLogRecommendationFeedback(deps: RecommendationFeedbackDeps = defaultDeps) {
  return async function logRecommendationFeedback(
    recommendationId: string,
    action: FeedbackActionType
  ): Promise<LogRecommendationFeedbackResult> {
    const program = Effect.gen(function* () {
      const now = Date.now();
      const newEvent: NewFeedbackEvent = {
        id: deps.nanoid(),
        recommendationId,
        action,
        createdAt: now,
      };

      yield* tryPromise(
        () => deps.db.insert(deps.feedbackEvents).values(newEvent),
        (error): AppError =>
          appError('DATABASE_ERROR', 'Failed to log feedback event', error)
      );

      return {
        success: true as const,
        event: newEvent as FeedbackEvent,
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

export function createGetRecentFeedbackEvents(deps: RecommendationFeedbackDeps = defaultDeps) {
  return async function getRecentFeedbackEvents(
    limit: number = 50
  ): Promise<GetRecentFeedbackResult> {
    const program = Effect.gen(function* () {
      const events = (yield* tryPromise(
        () =>
          deps.db
            .select()
            .from(deps.feedbackEvents)
            .orderBy(deps.desc(deps.feedbackEvents.createdAt))
            .limit(limit),
        (error): AppError =>
          appError('DATABASE_ERROR', 'Failed to retrieve feedback events', error)
      )) as FeedbackEvent[];

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
