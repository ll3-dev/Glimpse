/**
 * Get All Knowledge Items Use Case
 *
 * Retrieves all saved knowledge items (notes and links) from the database.
 * Items are ordered by creation date, newest first.
 */

import { desc } from 'drizzle-orm';
import { db, knowledgeItems, type KnowledgeItem } from '@/src/db';

/**
 * Result type for successful retrieval
 */
export interface GetItemsSuccessResult {
  success: true;
  data: KnowledgeItem[];
}

/**
 * Result type for failed retrieval
 */
export interface GetItemsFailureResult {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Union result type for get operation
 */
export type GetItemsResult = GetItemsSuccessResult | GetItemsFailureResult;

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
export async function getAllKnowledgeItems(): Promise<GetItemsResult> {
  try {
    // Query all items, ordered by creation date (newest first)
    const items = await db
      .select()
      .from(knowledgeItems)
      .orderBy(desc(knowledgeItems.createdAt));

    // Return success with items
    return {
      success: true,
      data: items,
    };
  } catch (error) {
    // Handle database or unexpected errors
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve knowledge items',
        details: error instanceof Error ? error.message : error,
      },
    };
  }
}
