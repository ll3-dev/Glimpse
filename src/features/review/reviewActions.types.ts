import { db, knowledgeItems, type KnowledgeItem } from '@/src/db';
import { eq } from 'drizzle-orm';
import { logger } from '@/src/utils/logger';
import { calculateNextReviewFromFeedback } from './adjustIntervalFromFeedback';
import type { AppError } from '@/src/lib/effect-result';

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
  db: typeof db;
  knowledgeItems: typeof knowledgeItems;
  eq: typeof eq;
  logger: Pick<typeof logger, 'info' | 'error'>;
  calculateNextReviewFromFeedback: typeof calculateNextReviewFromFeedback;
}
