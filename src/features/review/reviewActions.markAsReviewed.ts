import { Effect } from 'effect';
import type { KnowledgeItem } from '@/src/db';
import {
  appError,
  isFailure,
  runEffectSuccess,
  type AppError,
  tryPromise,
} from '@/src/lib/effect-result';
import { loadKnowledgeItemOrFail } from './reviewActions.shared';
import type {
  ReviewActionFailureResult,
  ReviewActionResult,
  ReviewActionsDeps,
} from './reviewActions.types';
import type { ReviewFeedbackType } from './adjustIntervalFromFeedback';

export function createMarkAsReviewed(deps: ReviewActionsDeps) {
  return async function markAsReviewed(
    itemId: string,
    feedbackType: ReviewFeedbackType = 'remembered'
  ): Promise<ReviewActionResult | ReviewActionFailureResult> {
    const program = Effect.gen(function* () {
      const item = yield* loadKnowledgeItemOrFail(deps, itemId);
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
