import { Effect } from 'effect';
import type { KnowledgeItem } from '@/src/db';
import { appError, type AppError, tryPromise } from '@/src/lib/effect-result';
import type { ReviewActionsDeps } from './reviewActions.types';

export function loadKnowledgeItemOrFail(deps: ReviewActionsDeps, itemId: string) {
  return Effect.gen(function* () {
    const items = (yield* tryPromise(
      () =>
        deps.db
          .select()
          .from(deps.knowledgeItems)
          .where(deps.eq(deps.knowledgeItems.id, itemId)),
      (error): AppError => appError('DATABASE_ERROR', 'Failed to update item', error)
    )) as KnowledgeItem[];

    if (items.length === 0) {
      return yield* Effect.fail(appError('NOT_FOUND', 'Item not found'));
    }

    return items[0] as KnowledgeItem;
  });
}
