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

/**
 * Updates a recommendation's status based on user response.
 * Also logs the feedback event for analytics.
 *
 * @param recommendationId - The ID of the recommendation to update
 * @param action - The user's action: 'accept', 'ignore', or 'dismiss'
 */
export async function respondToRecommendation(
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
    await db
      .update(recommendations)
      .set({
        status: newStatus,
        respondedAt: now,
      })
      .where(eq(recommendations.id, recommendationId));

    // Log feedback event
    await logRecommendationFeedback(recommendationId, action);

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
}
