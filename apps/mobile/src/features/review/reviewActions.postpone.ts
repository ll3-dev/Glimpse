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
import { DEFAULT_POSTPONE_INTERVAL_MS } from './reviewActions.types';

export function createPostponeReview(deps: ReviewActionsDeps) {
  return async function postponeReview(
    itemId: string,
    intervalMs: number = DEFAULT_POSTPONE_INTERVAL_MS
  ): Promise<ReviewActionResult | ReviewActionFailureResult> {
    const program = Effect.gen(function* () {
      const item = yield* loadKnowledgeItemOrFail(deps, itemId);
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
