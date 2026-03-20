import { logger } from '@/src/utils/logger';
import { calculateNextReviewFromFeedback } from './adjustIntervalFromFeedback';
import type { AppError } from '@/src/lib/effect-result';
import { type MobileCoreClient } from '@/src/features/core';
import type { KnowledgeItem } from '@glimpse/shared';

export const DEFAULT_REVIEW_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;
export const DEFAULT_POSTPONE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface ReviewActionResult {
  success: true;
  data: KnowledgeItem;
}

export interface ReviewActionFailureResult {
  success: false;
  error: AppError;
}

export interface ReviewActionsDeps {
  coreClient: Pick<MobileCoreClient, 'getKnowledgeItemById' | 'updateKnowledgeItem'>;
  logger: Pick<typeof logger, 'info' | 'error'>;
  calculateNextReviewFromFeedback: typeof calculateNextReviewFromFeedback;
}
