import { logger } from '@/src/utils/logger';
import { calculateNextReviewFromFeedback } from './adjustIntervalFromFeedback';
import {
  createMarkAsForgotten,
  createMarkAsReviewed,
  createPostponeReview,
  type ReviewActionsDeps,
} from '@/src/features/core/application/review';
import { mobileCoreClient } from '@/src/features/core';

export {
  DEFAULT_POSTPONE_INTERVAL_MS,
  DEFAULT_REVIEW_INTERVAL_MS,
  type ReviewActionFailureResult,
  type ReviewActionResult,
  type ReviewActionsDeps,
} from './reviewActions.types';

const defaultDeps: ReviewActionsDeps = {
  coreClient: mobileCoreClient,
  logger,
  calculateNextReviewFromFeedback,
};

export const markAsReviewed = createMarkAsReviewed(defaultDeps);
export const markAsForgotten = createMarkAsForgotten(defaultDeps);
export const postponeReview = createPostponeReview(defaultDeps);

export { createMarkAsForgotten, createMarkAsReviewed, createPostponeReview };
