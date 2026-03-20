/**
 * Review Feature Module
 *
 * Handles spaced repetition review scheduling for knowledge items.
 */

export type { KnowledgeItem } from '@glimpse/shared';

export {
  calculateInitialReviewAt,
  initializeReviewSchedule,
  batchInitializeReviewSchedules,
  DEFAULT_INITIAL_REVIEW_INTERVAL_MS,
} from './initializeReviewSchedule';

export { getDueItems, type GetDueItemsOptions, type GetDueItemsResult } from './getDueItems';

export {
  markAsReviewed,
  postponeReview,
  DEFAULT_REVIEW_INTERVAL_MS,
  DEFAULT_POSTPONE_INTERVAL_MS,
  type ReviewActionResult,
  type ReviewActionFailureResult,
} from './reviewActions';

export {
  calculateCurrentInterval,
  clampInterval,
  calculateAdjustedInterval,
  calculateNextReviewFromFeedback,
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
  DEFAULT_INITIAL_INTERVAL_MS as DEFAULT_INTERVAL_MS,
  type ReviewFeedbackType,
} from './adjustIntervalFromFeedback';
