/**
 * Get Weekly Items Use Case
 *
 * Retrieves knowledge items from the last 7 days for digest recommendations.
 */

import { desc, gte } from 'drizzle-orm';
import { Effect } from 'effect';
import { db, knowledgeItems, type KnowledgeItem } from '@/src/db';
import {
  appError,
  type AppError,
  type FailureResult,
  type Result,
  runEffectResult,
  tryPromise,
} from '@/src/lib/effect-result';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type WeeklyItemsSuccessResult = { success: true; data: KnowledgeItem[] };
export type WeeklyItemsFailureResult = FailureResult;
export type WeeklyItemsResult = Result<KnowledgeItem[]>;

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
    const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;
    const queryEffect = tryPromise(
      () =>
        deps.db
          .select()
          .from(deps.knowledgeItems)
          .where(deps.gte(deps.knowledgeItems.createdAt, sevenDaysAgo))
          .orderBy(deps.desc(deps.knowledgeItems.createdAt)),
      (error): AppError =>
        appError('DATABASE_ERROR', 'Failed to retrieve weekly items', error)
    );

    return runEffectResult(queryEffect.pipe(Effect.map((items) => items as KnowledgeItem[])));
  };
}

export const getWeeklyItems = createGetWeeklyItems();
