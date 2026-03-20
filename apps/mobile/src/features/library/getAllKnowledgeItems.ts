/**
 * Get All Knowledge Items Use Case
 *
 * Retrieves all saved knowledge items (notes and links) from the database.
 * Items are ordered by creation date, newest first.
 */

import { Effect } from 'effect';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import type { KnowledgeItem } from '@glimpse/shared';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '@/src/lib/effect-result';

/**
 * Result type for successful retrieval
 */
export type GetItemsSuccessResult = { success: true; data: KnowledgeItem[] };
export type GetItemsFailureResult = FailureResult;
export type GetItemsResult = Result<KnowledgeItem[]>;

export interface GetAllKnowledgeItemsDeps {
  coreClient: Pick<MobileCoreClient, 'listKnowledgeItems'>;
}

const defaultDeps: GetAllKnowledgeItemsDeps = {
  coreClient: mobileCoreClient,
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
    const queryEffect = Effect.tryPromise({
      try: () => deps.coreClient.listKnowledgeItems(),
      catch: (error) => appError('DATABASE_ERROR', 'Failed to retrieve knowledge items', error),
    });

    return runEffectResult(queryEffect.pipe(Effect.map((items) => items as KnowledgeItem[])));
  };
}

export const getAllKnowledgeItems = createGetAllKnowledgeItems();
