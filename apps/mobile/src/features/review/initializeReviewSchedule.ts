/**
 * Initialize Review Schedule
 *
 * Calculates and sets the initial review schedule for knowledge items.
 * Uses a simple fixed interval approach for MVP v2.
 *
 * Default: First review is scheduled 1 day after item creation.
 */

import { db, knowledgeItems } from '@/src/db';
import { eq, isNull } from 'drizzle-orm';
import { Effect } from 'effect';
import { logger } from '@/src/utils/logger';
import { appError, tryPromise } from '@/src/lib/effect-result';
import { mobileCoreClient } from '@/src/features/core';

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
  return mobileCoreClient.initializeReviewSchedule({ createdAt });
}

export interface BatchInitializeReviewSchedulesDeps {
  db: typeof db;
  knowledgeItems: typeof knowledgeItems;
  eq: typeof eq;
  isNull: typeof isNull;
  logger: Pick<typeof logger, 'info' | 'error'>;
}

const defaultDeps: BatchInitializeReviewSchedulesDeps = {
  db,
  knowledgeItems,
  eq,
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
    const program = Effect.gen(function* () {
      const itemsWithoutSchedule = yield* tryPromise(
        () =>
          deps.db
            .select()
            .from(deps.knowledgeItems)
            .where(deps.isNull(deps.knowledgeItems.nextReviewAt)),
        (error) =>
          appError('DATABASE_ERROR', 'Failed to batch initialize review schedules', error)
      );

      if (itemsWithoutSchedule.length === 0) {
        deps.logger.info('No items need review schedule initialization');
        return 0;
      }

      let updatedCount = 0;

      for (const item of itemsWithoutSchedule) {
        const nextReviewAt = calculateInitialReviewAt(item.createdAt, intervalMs);
        yield* tryPromise(
          () =>
            deps.db
              .update(deps.knowledgeItems)
              .set({ nextReviewAt })
              .where(deps.eq(deps.knowledgeItems.id, item.id)),
          (error) =>
            appError('DATABASE_ERROR', 'Failed to batch initialize review schedules', error)
        );
        updatedCount++;
      }

      deps.logger.info(`Initialized review schedules for ${updatedCount} items`);
      return updatedCount;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          deps.logger.error('Failed to batch initialize review schedules', error);
        })
      )
    );

    return Effect.runPromise(program);
  };
}

export const batchInitializeReviewSchedules = createBatchInitializeReviewSchedules();
