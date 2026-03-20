import { Effect } from 'effect';
import type { KnowledgeItem } from '@glimpse/shared';
import { appError, type AppError } from '@/src/lib/effect-result';
import type { ReviewActionsDeps } from './reviewActions.types';

export function loadKnowledgeItemOrFail(deps: ReviewActionsDeps, itemId: string) {
  return Effect.gen(function* () {
    const item = (yield* Effect.tryPromise({
      try: () => deps.coreClient.getKnowledgeItemById(itemId),
      catch: (error): AppError => appError('DATABASE_ERROR', 'Failed to update item', error),
    })) as KnowledgeItem | null;

    if (item === null) {
      return yield* Effect.fail(appError('NOT_FOUND', 'Item not found'));
    }

    return item;
  });
}
