/**
 * Review Actions
 *
 * Handles marking items as reviewed and postponing reviews.
 * Uses interval adjustment based on feedback for MVP v2.
 */

import { db, knowledgeItems, type KnowledgeItem } from '@/src/db';
import { eq } from 'drizzle-orm';
import { Effect } from 'effect';
import { logger } from '@/src/utils/logger';
import {
  calculateNextReviewFromFeedback,
  type ReviewFeedbackType,
} from './adjustIntervalFromFeedback';
import {
  appError,
  isFailure,
  type AppError,
  runEffectSuccess,
  tryPromise,
} from '@/src/lib/effect-result';

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
  error: AppError;
}

export interface ReviewActionsDeps {
  db: typeof db;
  knowledgeItems: typeof knowledgeItems;
  eq: typeof eq;
  logger: Pick<typeof logger, 'info' | 'error'>;
  calculateNextReviewFromFeedback: typeof calculateNextReviewFromFeedback;
}

const defaultDeps: ReviewActionsDeps = {
  db,
  knowledgeItems,
  eq,
  logger,
  calculateNextReviewFromFeedback,
};

/**
 * Marks a knowledge item as reviewed.
 * Uses interval adjustment based on previous review history.
 *
 * @param itemId - The ID of the item to mark as reviewed
 * @param feedbackType - Type of feedback (default: 'remembered')
 * @returns Updated knowledge item
 */
export function createMarkAsReviewed(deps: ReviewActionsDeps = defaultDeps) {
  return async function markAsReviewed(
    itemId: string,
    feedbackType: ReviewFeedbackType = 'remembered'
  ): Promise<ReviewActionResult | ReviewActionFailureResult> {
    const program = Effect.gen(function* () {
      const items = (yield* tryPromise(
        () =>
          deps.db
            .select()
            .from(deps.knowledgeItems)
            .where(deps.eq(deps.knowledgeItems.id, itemId)),
        (error): AppError => appError('DATABASE_ERROR', 'Failed to update item', error)
      )) as KnowledgeItem[];

      if (items.length === 0) {
        yield* Effect.fail(appError('NOT_FOUND', 'Item not found'));
      }

      const item = items[0];
      const now = Date.now();
      const { nextReviewAt, intervalMs } = deps.calculateNextReviewFromFeedback(
        item.lastReviewedAt,
        item.nextReviewAt,
        feedbackType
      );

      const result = (yield* tryPromise(
        () =>
          deps.db
            .update(deps.knowledgeItems)
            .set({
              lastReviewedAt: now,
              nextReviewAt,
              updatedAt: now,
            })
            .where(deps.eq(deps.knowledgeItems.id, itemId))
            .returning(),
        (error): AppError => appError('DATABASE_ERROR', 'Failed to update item', error)
      )) as KnowledgeItem[];

      deps.logger.info('Item marked as reviewed', {
        itemId,
        feedbackType,
        intervalDays: Math.round(intervalMs / (24 * 60 * 60 * 1000)),
      });

      return {
        success: true as const,
        data: result[0] as KnowledgeItem,
      };
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          deps.logger.error('Failed to mark item as reviewed', error, { itemId });
        })
      )
    );

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

/**
 * Postpones the review of a knowledge item.
 * Adds a fixed interval to the current nextReviewAt.
 *
 * @param itemId - The ID of the item to postpone
 * @param intervalMs - Custom postpone interval (default: 1 day)
 * @returns Updated knowledge item
 */
export function createPostponeReview(deps: ReviewActionsDeps = defaultDeps) {
  return async function postponeReview(
    itemId: string,
    intervalMs: number = DEFAULT_POSTPONE_INTERVAL_MS
  ): Promise<ReviewActionResult | ReviewActionFailureResult> {
    const program = Effect.gen(function* () {
      const items = (yield* tryPromise(
        () =>
          deps.db
            .select()
            .from(deps.knowledgeItems)
            .where(deps.eq(deps.knowledgeItems.id, itemId)),
        (error): AppError => appError('DATABASE_ERROR', 'Failed to update item', error)
      )) as KnowledgeItem[];

      if (items.length === 0) {
        yield* Effect.fail(appError('NOT_FOUND', 'Item not found'));
      }

      const item = items[0];
      const currentNextReview = item.nextReviewAt ?? Date.now();
      const nextReviewAt = currentNextReview + intervalMs;
      const now = Date.now();

      const result = (yield* tryPromise(
        () =>
          deps.db
            .update(deps.knowledgeItems)
            .set({
              nextReviewAt,
              updatedAt: now,
            })
            .where(deps.eq(deps.knowledgeItems.id, itemId))
            .returning(),
        (error): AppError => appError('DATABASE_ERROR', 'Failed to update item', error)
      )) as KnowledgeItem[];

      deps.logger.info('Review postponed', { itemId, nextReviewAt });

      return {
        success: true as const,
        data: result[0] as KnowledgeItem,
      };
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          deps.logger.error('Failed to postpone review', error, { itemId });
        })
      )
    );

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

export const markAsReviewed = createMarkAsReviewed();
export const postponeReview = createPostponeReview();
