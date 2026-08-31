import {
  calculateInitialReviewAt,
  createBatchInitializeReviewSchedules,
  DEFAULT_INITIAL_REVIEW_INTERVAL_MS,
  initializeReviewScheduleWithCore,
  type BatchInitializeReviewSchedulesDeps,
} from '@glimpse/features';
import type { InitializeReviewScheduleOutput } from '@glimpse/shared';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import { logger } from '@/src/utils/logger';

export { calculateInitialReviewAt, DEFAULT_INITIAL_REVIEW_INTERVAL_MS };
export type { BatchInitializeReviewSchedulesDeps };

export async function initializeReviewSchedule(createdAt: number): Promise<InitializeReviewScheduleOutput> {
  return initializeReviewScheduleWithCore(mobileCoreClient, createdAt);
}

const defaultDeps: BatchInitializeReviewSchedulesDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'listKnowledgeItems' | 'updateKnowledgeItem'>,
  logger,
};

export const batchInitializeReviewSchedules = createBatchInitializeReviewSchedules(defaultDeps);
