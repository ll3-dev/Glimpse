/**
 * Get Due Review Items
 *
 * Queries knowledge items that are due for review.
 * Items with nextReviewAt <= now are considered due.
 */

import { Effect } from 'effect';
import { logger } from '@/src/utils/logger';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import type { KnowledgeItem } from '@glimpse/shared';
import {
  appError,
  isFailure,
  type AppError,
  runEffectSuccess,
} from '@/src/lib/effect-result';

/**
 * Options for getting due items
 */
export interface GetDueItemsOptions {
  /** Maximum number of items to return (default: no limit) */
  limit?: number;
  /** Reference time for "now" (default: Date.now()) */
  now?: number;
}

/**
 * Result type for getDueItems
 */
export interface GetDueItemsSuccessResult {
  success: true;
  items: KnowledgeItem[];
  count: number;
}

export interface GetDueItemsFailureResult {
  success: false;
  error: AppError;
}

export type GetDueItemsResult = GetDueItemsSuccessResult | GetDueItemsFailureResult;

export interface GetDueItemsDeps {
  coreClient: Pick<MobileCoreClient, 'getDueKnowledgeItems'>;
  logger: Pick<typeof logger, 'error'>;
}

const defaultDeps: GetDueItemsDeps = {
  coreClient: mobileCoreClient,
  logger,
};

/**
 * Gets knowledge items that are due for review.
 * Items are sorted by nextReviewAt ascending (oldest/most overdue first).
 *
 * @param options - Query options
 * @returns Result with due items
 *
 * @example
 * // Get all due items
 * const result = await getDueItems();
 *
 * @example
 * // Get top 10 due items
 * const result = await getDueItems({ limit: 10 });
 */
export function createGetDueItems(deps: GetDueItemsDeps = defaultDeps) {
  return async function getDueItems(
    options: GetDueItemsOptions = {}
  ): Promise<GetDueItemsResult> {
    const { limit, now = Date.now() } = options;

    const program = Effect.gen(function* () {
      const items = (yield* Effect.tryPromise({
        try: () => deps.coreClient.getDueKnowledgeItems({ now, limit }),
        catch: (error): AppError => appError('DATABASE_ERROR', 'Failed to get due items', error),
      })) as KnowledgeItem[];

      return {
        success: true as const,
        items,
        count: items.length,
      };
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          deps.logger.error('Failed to get due items', error);
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

export const getDueItems = createGetDueItems();
