/**
 * Get Weekly Items Use Case
 *
 * Retrieves knowledge items from the last 7 days for digest recommendations.
 */

import { desc, gte } from 'drizzle-orm';
import { db, knowledgeItems, type KnowledgeItem } from '@/src/db';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface WeeklyItemsSuccessResult {
  success: true;
  data: KnowledgeItem[];
}

export interface WeeklyItemsFailureResult {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type WeeklyItemsResult = WeeklyItemsSuccessResult | WeeklyItemsFailureResult;

export interface GetWeeklyItemsDeps {
  db: typeof db;
  knowledgeItems: typeof knowledgeItems;
  gte: typeof gte;
  desc: typeof desc;
}

const defaultDeps: GetWeeklyItemsDeps = {
  db,
  knowledgeItems,
  gte,
  desc,
};

/**
 * Retrieves knowledge items created in the last 7 days.
 * Returns items ordered by creation date (newest first).
 */
export function createGetWeeklyItems(deps: GetWeeklyItemsDeps = defaultDeps) {
  return async function getWeeklyItems(): Promise<WeeklyItemsResult> {
    try {
      const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;

      const items = await deps.db
        .select()
        .from(deps.knowledgeItems)
        .where(deps.gte(deps.knowledgeItems.createdAt, sevenDaysAgo))
        .orderBy(deps.desc(deps.knowledgeItems.createdAt));

      return {
        success: true,
        data: items,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve weekly items',
          details: error instanceof Error ? error.message : error,
        },
      };
    }
  };
}

export const getWeeklyItems = createGetWeeklyItems();
