/**
 * Get All Knowledge Items Use Case
 *
 * Retrieves all saved knowledge items (notes and links) from the database.
 * Items are ordered by creation date, newest first.
 */

import { desc } from 'drizzle-orm';
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

/**
 * Result type for successful retrieval
 */
export type GetItemsSuccessResult = { success: true; data: KnowledgeItem[] };
export type GetItemsFailureResult = FailureResult;
export type GetItemsResult = Result<KnowledgeItem[]>;

export interface GetAllKnowledgeItemsDeps {
  db: typeof db;
  knowledgeItems: typeof knowledgeItems;
  desc: typeof desc;
}

const defaultDeps: GetAllKnowledgeItemsDeps = {
  db,
  knowledgeItems,
  desc,
};

/**
 * Retrieves all knowledge items from the database, ordered by creation date (newest first).
 *
 * This function:
 * 1. Queries all knowledge items from the database
 * 2. Orders them by creation date in descending order (newest first)
 * 3. Returns the items or an error if the query fails
 *
 * @returns A GetItemsResult containing the items array or an error
 *
 * @example
 * // Get all items
 * const result = await getAllKnowledgeItems();
 * if (result.success) {
 *   console.log(`Found ${result.data.length} items`);
 *   result.data.forEach(item => {
 *     console.log(`${item.type}: ${item.title || 'No title'}`);
 *   });
 * }
 */
export function createGetAllKnowledgeItems(deps: GetAllKnowledgeItemsDeps = defaultDeps) {
  return async function getAllKnowledgeItems(): Promise<GetItemsResult> {
    const queryEffect = tryPromise(
      () =>
        deps.db
          .select()
          .from(deps.knowledgeItems)
          .orderBy(deps.desc(deps.knowledgeItems.createdAt)),
      (error): AppError =>
        appError('DATABASE_ERROR', 'Failed to retrieve knowledge items', error)
    );

    return runEffectResult(queryEffect.pipe(Effect.map((items) => items as KnowledgeItem[])));
  };
}

export const getAllKnowledgeItems = createGetAllKnowledgeItems();
