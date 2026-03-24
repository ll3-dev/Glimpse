import { calculateNextReviewFromFeedback } from '../../domain/review/adjustIntervalFromFeedback';
import type { AppError } from '../../foundation/effect-result';
import type { CoreClient } from '../../ports/core-client';
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
  coreClient: Pick<CoreClient, 'getKnowledgeItemById' | 'updateKnowledgeItem'>;
  logger: {
    info(message: string, context?: Record<string, unknown>): void;
    error(message: string, error?: unknown, context?: Record<string, unknown>): void;
  };
  calculateNextReviewFromFeedback: typeof calculateNextReviewFromFeedback;
}
