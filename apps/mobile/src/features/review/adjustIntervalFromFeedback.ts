/**
 * Review interval scheduling lives in @glimpse/features so mobile and desktop
 * share one implementation; this module keeps the historical import path.
 */
export {
  calculateNextReviewState,
  calculateNextReviewFromFeedbackImpl as calculateNextReviewFromFeedback,
  clampInterval,
  toCoreInput,
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
} from '@glimpse/features';
export { DEFAULT_INITIAL_REVIEW_INTERVAL_MS as DEFAULT_INITIAL_INTERVAL_MS } from '@glimpse/features';
export type { ReviewFeedbackType } from '@glimpse/shared';
