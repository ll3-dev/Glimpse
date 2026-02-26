/**
 * Get Due Review Items
 *
 * Queries knowledge items that are due for review.
 * Items with nextReviewAt <= now are considered due.
 */

import { db, knowledgeItems, type KnowledgeItem } from '@/src/db';
import { lte, asc, and, isNotNull } from 'drizzle-orm';
import { Effect } from 'effect';
import { logger } from '@/src/utils/logger';
import {
  appError,
  isFailure,
  type AppError,
  runEffectSuccess,
  tryPromise,
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
  db: typeof db;
  knowledgeItems: typeof knowledgeItems;
  lte: typeof lte;
  asc: typeof asc;
  and: typeof and;
  isNotNull: typeof isNotNull;
  logger: Pick<typeof logger, 'error'>;
}

const defaultDeps: GetDueItemsDeps = {
  db,
  knowledgeItems,
  lte,
  asc,
  and,
  isNotNull,
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
      let query = deps.db
        .select()
        .from(deps.knowledgeItems)
        .where(
          deps.and(
            deps.isNotNull(deps.knowledgeItems.nextReviewAt),
            deps.lte(deps.knowledgeItems.nextReviewAt, now)
          )
        )
        .orderBy(deps.asc(deps.knowledgeItems.nextReviewAt));

      if (limit !== undefined && limit > 0) {
        query = query.limit(limit) as typeof query;
      }

      const items = (yield* tryPromise(
        () => query,
        (error): AppError => appError('DATABASE_ERROR', 'Failed to get due items', error)
      )) as KnowledgeItem[];

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
