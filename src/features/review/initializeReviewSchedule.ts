/**
 * Initialize Review Schedule
 *
 * Calculates and sets the initial review schedule for knowledge items.
 * Uses a simple fixed interval approach for MVP v2.
 *
 * Default: First review is scheduled 1 day after item creation.
 */

import { db, knowledgeItems } from '@/src/db';
import { isNull } from 'drizzle-orm';
import { logger } from '@/src/utils/logger';

/**
 * Default initial review interval in milliseconds
 * 1 day = 24 * 60 * 60 * 1000 = 86,400,000 ms
 */
export const DEFAULT_INITIAL_REVIEW_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day

/**
 * Calculates the initial review timestamp.
 * By default, schedules the first review 1 day from now.
 *
 * @param createdAt - The creation timestamp (defaults to Date.now())
 * @param intervalMs - Custom interval in milliseconds (defaults to 1 day)
 * @returns The timestamp for the first review
 */
export function calculateInitialReviewAt(
  createdAt: number = Date.now(),
  intervalMs: number = DEFAULT_INITIAL_REVIEW_INTERVAL_MS
): number {
  return createdAt + intervalMs;
}

/**
 * Initializes review schedule fields for a new knowledge item.
 * Returns the review-related fields to be spread into the item.
 *
 * @param createdAt - The creation timestamp
 * @returns Object with review schedule fields
 */
export function initializeReviewSchedule(createdAt: number): {
  nextReviewAt: number;
  stability: null;
  difficulty: null;
  lastReviewedAt: null;
} {
  return {
    nextReviewAt: calculateInitialReviewAt(createdAt),
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
  };
}

export interface BatchInitializeReviewSchedulesDeps {
  db: typeof db;
  knowledgeItems: typeof knowledgeItems;
  isNull: typeof isNull;
  logger: Pick<typeof logger, 'info' | 'error'>;
}

const defaultDeps: BatchInitializeReviewSchedulesDeps = {
  db,
  knowledgeItems,
  isNull,
  logger,
};

/**
 * Batch initializes review schedules for existing items that don't have one.
 * This is useful for migrating existing data.
 *
 * @param intervalMs - Custom interval in milliseconds (defaults to 1 day)
 * @returns Number of items updated
 */
export function createBatchInitializeReviewSchedules(
  deps: BatchInitializeReviewSchedulesDeps = defaultDeps
) {
  return async function batchInitializeReviewSchedules(
    intervalMs: number = DEFAULT_INITIAL_REVIEW_INTERVAL_MS
  ): Promise<number> {
    try {
      // Find items without nextReviewAt
      const itemsWithoutSchedule = await deps.db
        .select()
        .from(deps.knowledgeItems)
        .where(deps.isNull(deps.knowledgeItems.nextReviewAt));

      if (itemsWithoutSchedule.length === 0) {
        deps.logger.info('No items need review schedule initialization');
        return 0;
      }

      // Update each item with initial review schedule
      let updatedCount = 0;

      for (const item of itemsWithoutSchedule) {
        const nextReviewAt = calculateInitialReviewAt(item.createdAt, intervalMs);

        await deps.db
          .update(deps.knowledgeItems)
          .set({ nextReviewAt })
          .where(deps.knowledgeItems.id.eq?.(item.id) as any);

        updatedCount++;
      }

      deps.logger.info(`Initialized review schedules for ${updatedCount} items`);
      return updatedCount;
    } catch (error) {
      deps.logger.error('Failed to batch initialize review schedules', error);
      throw error;
    }
  };
}

export const batchInitializeReviewSchedules = createBatchInitializeReviewSchedules();
