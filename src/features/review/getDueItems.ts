/**
 * Get Due Review Items
 *
 * Queries knowledge items that are due for review.
 * Items with nextReviewAt <= now are considered due.
 */

import { db, knowledgeItems, type KnowledgeItem } from '@/src/db';
import { lte, asc, isNotNull } from 'drizzle-orm';
import { logger } from '@/src/utils/logger';

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
export interface GetDueItemsResult {
  success: true;
  items: KnowledgeItem[];
  count: number;
}

export interface GetDueItemsDeps {
  db: typeof db;
  knowledgeItems: typeof knowledgeItems;
  lte: typeof lte;
  asc: typeof asc;
  isNotNull: typeof isNotNull;
  logger: Pick<typeof logger, 'error'>;
}

const defaultDeps: GetDueItemsDeps = {
  db,
  knowledgeItems,
  lte,
  asc,
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

    try {
      // Build query - items with nextReviewAt that is not null and <= now
      let query = deps.db
        .select()
        .from(deps.knowledgeItems)
        .where(
          deps.isNotNull(deps.knowledgeItems.nextReviewAt),
          deps.lte(deps.knowledgeItems.nextReviewAt, now)
        )
        .orderBy(deps.asc(deps.knowledgeItems.nextReviewAt));

      // Apply limit if specified
      if (limit !== undefined && limit > 0) {
        query = query.limit(limit) as typeof query;
      }

      const items = await query;

      return {
        success: true,
        items,
        count: items.length,
      };
    } catch (error) {
      deps.logger.error('Failed to get due items', error);
      // Return empty result on error instead of throwing
      return {
        success: true,
        items: [],
        count: 0,
      };
    }
  };
}

export const getDueItems = createGetDueItems();
