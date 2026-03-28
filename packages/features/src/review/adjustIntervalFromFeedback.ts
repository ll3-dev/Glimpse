/**
 * Adjust Interval From Feedback
 *
 * Calculates review interval adjustments based on user feedback.
 */

export type ReviewFeedbackType = 'remembered' | 'postponed';

export const MIN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day
export const MAX_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const DEFAULT_INITIAL_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day

export const FEEDBACK_MULTIPLIERS: Record<ReviewFeedbackType, number> = {
  remembered: 2.0,
  postponed: 1.0,
};

export function calculateCurrentInterval(
  lastReviewedAt: number | null,
  nextReviewAt: number | null
): number {
  if (lastReviewedAt !== null && nextReviewAt !== null) {
    return nextReviewAt - lastReviewedAt;
  }
  return DEFAULT_INITIAL_INTERVAL_MS;
}

export function clampInterval(intervalMs: number): number {
  return Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, intervalMs));
}

export function calculateAdjustedInterval(
  currentIntervalMs: number,
  feedbackType: ReviewFeedbackType
): number {
  const multiplier = FEEDBACK_MULTIPLIERS[feedbackType];
  const newInterval = currentIntervalMs * multiplier;
  return clampInterval(newInterval);
}

export function calculateNextReviewFromFeedback(
  lastReviewedAt: number | null,
  nextReviewAt: number | null,
  feedbackType: ReviewFeedbackType,
  now: number = Date.now()
): { intervalMs: number; nextReviewAt: number } {
  const currentInterval = calculateCurrentInterval(lastReviewedAt, nextReviewAt);
  const adjustedInterval = calculateAdjustedInterval(currentInterval, feedbackType);

  return {
    intervalMs: adjustedInterval,
    nextReviewAt: now + adjustedInterval,
  };
}
