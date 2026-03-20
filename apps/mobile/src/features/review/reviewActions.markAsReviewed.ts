import { Effect } from 'effect';
import type { KnowledgeItem } from '@glimpse/shared';
import {
  appError,
  isFailure,
  runEffectSuccess,
  type AppError,
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

      const result = (yield* Effect.tryPromise({
        try: () =>
          deps.coreClient.updateKnowledgeItem(itemId, {
            lastReviewedAt: now,
            nextReviewAt,
            provisionalLabels: null,
            labelStatus: 'pending',
            labelSource: 'none',
            labelVersion: null,
            labelScore: null,
            labelRequestedAt: now,
            labelCompletedAt: null,
            labelError: null,
            updatedAt: now,
          }),
        catch: (error): AppError => appError('DATABASE_ERROR', 'Failed to update item', error),
      })) as KnowledgeItem;

      deps.logger.info('Item marked as reviewed', {
        itemId,
        feedbackType,
        intervalDays: Math.round(intervalMs / (24 * 60 * 60 * 1000)),
      });

      return {
        success: true as const,
        data: result,
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
