/**
 * Respond to Recommendation Use Case
 *
 * Updates recommendation status based on user action (accept/ignore/dismiss).
 * Also logs the feedback event for analytics.
 */

import { Effect } from 'effect';
import {
  appError,
  type AppError,
  isFailure,
  runEffectSuccess,
} from '../../foundation/effect-result';
import type { NewFeedbackEvent, RecommendationStatus } from '@glimpse/shared';
import type { CoreClient } from '../../ports/core-client';

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
  coreClient: Pick<CoreClient, 'respondToRecommendation'>;
  nanoid: () => string;
  isIdCollisionError: (error: unknown) => boolean;
  maxIdCollisionRetries: number;
}

/**
 * Updates a recommendation's status based on user response.
 * Also logs the feedback event for analytics.
 *
 * @param recommendationId - The ID of the recommendation to update
 * @param action - The user's action: 'accept', 'ignore', or 'dismiss'
 */
export function createRespondToRecommendation(deps: RespondToRecommendationDeps) {
  return async function respondToRecommendation(
    recommendationId: string,
    action: 'accept' | 'ignore' | 'dismiss'
  ): Promise<RespondToRecommendationResult> {
    const statusMap: Record<string, RecommendationStatus> = {
      accept: 'accepted',
      ignore: 'ignored',
      dismiss: 'dismissed',
    };
    const newStatus = statusMap[action];

    for (let attempt = 0; attempt <= deps.maxIdCollisionRetries; attempt++) {
      const now = Date.now();
      const newFeedbackEvent: NewFeedbackEvent = {
        id: deps.nanoid(),
        recommendationId,
        action,
        createdAt: now,
      };

      const batchResult = await runEffectSuccess(
        Effect.tryPromise({
          try: () =>
            deps.coreClient.respondToRecommendation(
              recommendationId,
              newStatus,
              newFeedbackEvent
            ),
          catch: (error) =>
            appError('DATABASE_ERROR', 'Failed to persist recommendation response', error),
        }).pipe(
          Effect.map(() => ({
            success: true as const,
            status: newStatus,
          }))
        )
      );

      if (!isFailure(batchResult)) {
        return batchResult as RespondResult;
      }

      const isFinalAttempt = attempt === deps.maxIdCollisionRetries;
      if (!deps.isIdCollisionError(batchResult.error.details) || isFinalAttempt) {
        return {
          success: false,
          error: batchResult.error,
        };
      }
    }

    return {
      success: false,
      error: appError(
        'DATABASE_ERROR',
        'Failed to persist recommendation response after ID collision retries'
      ),
    };
  };
}
