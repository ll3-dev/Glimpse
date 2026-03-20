/**
 * Initialize Review Schedule
 *
 * Calculates and sets the initial review schedule for knowledge items.
 * Uses a simple fixed interval approach for MVP v2.
 *
 * Default: First review is scheduled 1 day after item creation.
 */

import { Effect } from 'effect';
import { logger } from '@/src/utils/logger';
import { appError, tryPromise } from '@/src/lib/effect-result';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import type { InitializeReviewScheduleOutput, KnowledgeItem } from '@glimpse/shared';

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
export function initializeReviewSchedule(
  createdAt: number
): InitializeReviewScheduleOutput {
  return mobileCoreClient.initializeReviewSchedule({ createdAt });
}

export interface BatchInitializeReviewSchedulesDeps {
  coreClient: Pick<
    MobileCoreClient,
    'listKnowledgeItems' | 'updateKnowledgeItem'
  >;
  logger: Pick<typeof logger, 'info' | 'error'>;
}

const defaultDeps: BatchInitializeReviewSchedulesDeps = {
  coreClient: mobileCoreClient,
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
      const itemsWithoutSchedule = (yield* tryPromise(
        () => deps.coreClient.listKnowledgeItems(),
        (error) =>
          appError('DATABASE_ERROR', 'Failed to batch initialize review schedules', error)
      )) as KnowledgeItem[];

      const pendingItems = itemsWithoutSchedule.filter((item) => item.nextReviewAt == null);

      if (pendingItems.length === 0) {
        deps.logger.info('No items need review schedule initialization');
        return 0;
      }

      let updatedCount = 0;

      for (const item of pendingItems) {
        const nextReviewAt = calculateInitialReviewAt(item.createdAt, intervalMs);
        yield* tryPromise(
          () => deps.coreClient.updateKnowledgeItem(item.id, { nextReviewAt }),
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
