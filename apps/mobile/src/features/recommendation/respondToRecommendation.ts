/**
 * Respond to Recommendation Use Case
 *
 * Updates recommendation status based on user action (accept/ignore/dismiss).
 * Also logs the feedback event for analytics.
 */

import {
  mobileCoreClient,
  type MobileCoreClient,
} from '@/src/features/core';
import { generateId, isIdCollisionError, MAX_ID_COLLISION_RETRIES } from '@/src/lib/id';
import { Effect } from 'effect';
import {
  appError,
  type AppError,
  isFailure,
  runEffectSuccess,
} from '@/src/lib/effect-result';
import type { NewFeedbackEvent, RecommendationStatus } from '@glimpse/shared';

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
  coreClient: Pick<MobileCoreClient, 'respondToRecommendation'>;
  nanoid: () => string;
}

const defaultDeps: RespondToRecommendationDeps = {
  coreClient: mobileCoreClient,
  nanoid: generateId,
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
    const statusMap: Record<string, RecommendationStatus> = {
      accept: 'accepted',
      ignore: 'ignored',
      dismiss: 'dismissed',
    };
    const newStatus = statusMap[action];

    for (let attempt = 0; attempt <= MAX_ID_COLLISION_RETRIES; attempt++) {
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
        return batchResult;
      }

      const isFinalAttempt = attempt === MAX_ID_COLLISION_RETRIES;
      if (!isIdCollisionError(batchResult.error.details) || isFinalAttempt) {
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

export const respondToRecommendation = createRespondToRecommendation();
