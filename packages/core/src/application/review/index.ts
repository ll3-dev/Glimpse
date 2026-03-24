/**
 * Review Feature Module
 *
 * Handles spaced repetition review scheduling for knowledge items.
 */

export type { KnowledgeItem } from '@glimpse/shared';

export {
  calculateInitialReviewAt,
  initializeReviewScheduleWithCore,
  DEFAULT_INITIAL_REVIEW_INTERVAL_MS,
} from './initializeReviewSchedule';
export {
  createBatchInitializeReviewSchedules,
  type BatchInitializeReviewSchedulesDeps,
} from './initializeReviewSchedule';
export {
  createGetDueItems,
  type GetDueItemsDeps,
  type GetDueItemsOptions,
  type GetDueItemsResult,
} from './getDueItems';

export {
  calculateCurrentInterval,
  clampInterval,
  calculateAdjustedInterval,
  calculateNextReviewFromFeedback,
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
  DEFAULT_INITIAL_INTERVAL_MS as DEFAULT_INTERVAL_MS,
  type ReviewFeedbackType,
} from '../../domain/review/adjustIntervalFromFeedback';
export {
  createMarkAsReviewed,
  createPostponeReview,
  DEFAULT_REVIEW_INTERVAL_MS,
  DEFAULT_POSTPONE_INTERVAL_MS,
  type ReviewActionResult,
  type ReviewActionFailureResult,
  type ReviewActionsDeps,
} from './reviewActions';
