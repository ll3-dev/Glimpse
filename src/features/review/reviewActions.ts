/**
 * Review Actions
 *
 * Handles marking items as reviewed and postponing reviews.
 * Uses interval adjustment based on feedback for MVP v2.
 */

import { db, knowledgeItems, type KnowledgeItem } from '@/src/db';
import { eq } from 'drizzle-orm';
import { logger } from '@/src/utils/logger';
import {
  calculateNextReviewFromFeedback,
  type ReviewFeedbackType,
} from './adjustIntervalFromFeedback';

/**
 * Default interval after successful review (fallback when no history)
 */
export const DEFAULT_REVIEW_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Default postpone interval (1 day)
 */
export const DEFAULT_POSTPONE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Result type for review actions
 */
export interface ReviewActionResult {
  success: true;
  data: KnowledgeItem;
}

export interface ReviewActionFailureResult {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * Marks a knowledge item as reviewed.
 * Uses interval adjustment based on previous review history.
 *
 * @param itemId - The ID of the item to mark as reviewed
 * @param feedbackType - Type of feedback (default: 'remembered')
 * @returns Updated knowledge item
 */
export async function markAsReviewed(
  itemId: string,
  feedbackType: ReviewFeedbackType = 'remembered'
): Promise<ReviewActionResult | ReviewActionFailureResult> {
  try {
    // First get the current item to calculate adjusted interval
    const items = await db
      .select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.id, itemId));

    if (items.length === 0) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Item not found',
        },
      };
    }

    const item = items[0];
    const now = Date.now();

    // Calculate next review based on feedback
    const { nextReviewAt, intervalMs } = calculateNextReviewFromFeedback(
      item.lastReviewedAt,
      item.nextReviewAt,
      feedbackType
    );

    const result = await db
      .update(knowledgeItems)
      .set({
        lastReviewedAt: now,
        nextReviewAt,
        updatedAt: now,
      })
      .where(eq(knowledgeItems.id, itemId))
      .returning();

    logger.info('Item marked as reviewed', {
      itemId,
      feedbackType,
      intervalDays: Math.round(intervalMs / (24 * 60 * 60 * 1000)),
    });

    return {
      success: true,
      data: result[0] as KnowledgeItem,
    };
  } catch (error) {
    logger.error('Failed to mark item as reviewed', error, { itemId });
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to update item',
      },
    };
  }
}

/**
 * Postpones the review of a knowledge item.
 * Adds a fixed interval to the current nextReviewAt.
 *
 * @param itemId - The ID of the item to postpone
 * @param intervalMs - Custom postpone interval (default: 1 day)
 * @returns Updated knowledge item
 */
export async function postponeReview(
  itemId: string,
  intervalMs: number = DEFAULT_POSTPONE_INTERVAL_MS
): Promise<ReviewActionResult | ReviewActionFailureResult> {
  try {
    // First get the current item to calculate new nextReviewAt
    const items = await db
      .select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.id, itemId));

    if (items.length === 0) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Item not found',
        },
      };
    }

    const item = items[0];
    const currentNextReview = item.nextReviewAt ?? Date.now();
    const nextReviewAt = currentNextReview + intervalMs;
    const now = Date.now();

    const result = await db
      .update(knowledgeItems)
      .set({
        nextReviewAt,
        updatedAt: now,
      })
      .where(eq(knowledgeItems.id, itemId))
      .returning();

    logger.info('Review postponed', { itemId, nextReviewAt });

    return {
      success: true,
      data: result[0] as KnowledgeItem,
    };
  } catch (error) {
    logger.error('Failed to postpone review', error, { itemId });
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to update item',
      },
    };
  }
}
