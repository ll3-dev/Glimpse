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
export async function getDueItems(
  options: GetDueItemsOptions = {}
): Promise<GetDueItemsResult> {
  const { limit, now = Date.now() } = options;

  try {
    // Build query - items with nextReviewAt that is not null and <= now
    let query = db
      .select()
      .from(knowledgeItems)
      .where(
        isNotNull(knowledgeItems.nextReviewAt),
        lte(knowledgeItems.nextReviewAt, now)
      )
      .orderBy(asc(knowledgeItems.nextReviewAt));

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
    logger.error('Failed to get due items', error);
    // Return empty result on error instead of throwing
    return {
      success: true,
      items: [],
      count: 0,
    };
  }
}
