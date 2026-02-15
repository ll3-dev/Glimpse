/**
 * Respond to Recommendation Use Case
 *
 * Updates recommendation status based on user action (accept/ignore/dismiss).
 * Also logs the feedback event for analytics.
 */

import { db, recommendations, type RecommendationStatus } from '@/src/db';
import { eq } from 'drizzle-orm';
import { logRecommendationFeedback } from './logRecommendationFeedback';

export interface RespondResult {
  success: true;
  status: RecommendationStatus;
}

export interface RespondFailureResult {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
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
    try {
      const statusMap: Record<string, RecommendationStatus> = {
        accept: 'accepted',
        ignore: 'ignored',
        dismiss: 'dismissed',
      };

      const newStatus = statusMap[action];
      const now = Date.now();

      // Update recommendation status
      await deps.db
        .update(deps.recommendations)
        .set({
          status: newStatus,
          respondedAt: now,
        })
        .where(deps.eq(deps.recommendations.id, recommendationId));

      // Log feedback event
      await deps.logRecommendationFeedback(recommendationId, action);

      return {
        success: true,
        status: newStatus,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update recommendation status',
          details: error instanceof Error ? error.message : error,
        },
      };
    }
  };
}

export const respondToRecommendation = createRespondToRecommendation();
