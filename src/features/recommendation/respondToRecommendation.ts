/**
 * Respond to Recommendation Use Case
 *
 * Updates recommendation status based on user action (accept/ignore/dismiss).
 * Also logs the feedback event for analytics.
 */

import { db, recommendations, type RecommendationStatus } from '@/src/db';
import { eq } from 'drizzle-orm';
import { Effect } from 'effect';
import { logRecommendationFeedback } from './logRecommendationFeedback';
import {
  appError,
  isFailure,
  type AppError,
  runEffectSuccess,
  tryPromise,
} from '@/src/lib/effect-result';

export interface RespondResult {
  success: true;
  status: RecommendationStatus;
}

export interface RespondFailureResult {
  success: false;
  error: AppError;
}

export type RespondToRecommendationResult = RespondResult | RespondFailureResult;

export interface RespondToRecommendationDeps {
  db: typeof db;
  recommendations: typeof recommendations;
  eq: typeof eq;
  logRecommendationFeedback: typeof logRecommendationFeedback;
}

const defaultDeps: RespondToRecommendationDeps = {
  db,
  recommendations,
  eq,
  logRecommendationFeedback,
};

/**
 * Updates a recommendation's status based on user response.
 * Also logs the feedback event for analytics.
 *
 * @param recommendationId - The ID of the recommendation to update
 * @param action - The user's action: 'accept', 'ignore', or 'dismiss'
 */
export function createRespondToRecommendation(deps: RespondToRecommendationDeps = defaultDeps) {
  return async function respondToRecommendation(
    recommendationId: string,
    action: 'accept' | 'ignore' | 'dismiss'
  ): Promise<RespondToRecommendationResult> {
    const program = Effect.gen(function* () {
      const statusMap: Record<string, RecommendationStatus> = {
        accept: 'accepted',
        ignore: 'ignored',
        dismiss: 'dismissed',
      };

      const newStatus = statusMap[action];
      const now = Date.now();

      yield* tryPromise(
        () =>
          deps.db
            .update(deps.recommendations)
            .set({
              status: newStatus,
              respondedAt: now,
            })
            .where(deps.eq(deps.recommendations.id, recommendationId)),
        (error): AppError =>
          appError('DATABASE_ERROR', 'Failed to update recommendation status', error)
      );

      const feedbackResult = yield* tryPromise(
        () => deps.logRecommendationFeedback(recommendationId, action),
        (error): AppError =>
          appError('DATABASE_ERROR', 'Failed to update recommendation status', error)
      );
      if (feedbackResult.success === false) {
        yield* Effect.fail(feedbackResult.error);
      }

      return {
        success: true as const,
        status: newStatus,
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

export const respondToRecommendation = createRespondToRecommendation();
