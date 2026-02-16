/**
 * Respond to Recommendation Use Case
 *
 * Updates recommendation status based on user action (accept/ignore/dismiss).
 * Also logs the feedback event for analytics.
 */

import { nanoid } from 'nanoid';
import {
  db,
  feedbackEvents,
  recommendations,
  type NewFeedbackEvent,
  type RecommendationStatus,
} from '@/src/db';
import { eq } from 'drizzle-orm';
import { Effect } from 'effect';
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
  feedbackEvents: typeof feedbackEvents;
  eq: typeof eq;
  nanoid: typeof nanoid;
}

const defaultDeps: RespondToRecommendationDeps = {
  db,
  recommendations,
  feedbackEvents,
  eq,
  nanoid,
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
      const newFeedbackEvent: NewFeedbackEvent = {
        id: deps.nanoid(),
        recommendationId,
        action,
        createdAt: now,
      };

      yield* tryPromise(
        () => deps.db.batch([
          deps.db
            .update(deps.recommendations)
            .set({
              status: newStatus,
              respondedAt: now,
            })
            .where(deps.eq(deps.recommendations.id, recommendationId)),
          deps.db.insert(deps.feedbackEvents).values(newFeedbackEvent),
        ]),
        (error): AppError =>
          appError('DATABASE_ERROR', 'Failed to persist recommendation response', error)
      );

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
