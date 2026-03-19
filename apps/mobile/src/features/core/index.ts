import type {
  CalculateNextReviewInput,
  CalculateNextReviewOutput,
  CalculateTagOverlapInput,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
} from '@glimpse/shared';

const DEFAULT_INITIAL_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = DEFAULT_INITIAL_INTERVAL_MS;
const MAX_INTERVAL_MS = 30 * DEFAULT_INITIAL_INTERVAL_MS;

export interface MobileCoreClient {
  calculateTagOverlap(input: CalculateTagOverlapInput): number;
  calculateNextReview(input: CalculateNextReviewInput): CalculateNextReviewOutput;
  initializeReviewSchedule(
    input: InitializeReviewScheduleInput
  ): InitializeReviewScheduleOutput;
}

// This client mirrors the future Craby bridge API so mobile orchestration can switch
// from JS fallback to Rust without changing feature call sites.
export const mobileCoreClient: MobileCoreClient = {
  calculateTagOverlap({ left, right }) {
    const leftTags = new Set(left.tags ?? []);
    return (right.tags ?? []).filter((tag) => leftTags.has(tag)).length;
  },

  calculateNextReview({ lastReviewedAt, nextReviewAt, feedbackType, now }) {
    const currentInterval =
      lastReviewedAt !== null && nextReviewAt !== null
        ? nextReviewAt - lastReviewedAt
        : DEFAULT_INITIAL_INTERVAL_MS;
    const nextInterval =
      feedbackType === 'remembered' ? currentInterval * 2 : currentInterval;
    const intervalMs = Math.max(
      MIN_INTERVAL_MS,
      Math.min(MAX_INTERVAL_MS, nextInterval)
    );

    return {
      intervalMs,
      nextReviewAt: now + intervalMs,
    };
  },

  initializeReviewSchedule({ createdAt, intervalMs }) {
    return {
      nextReviewAt: createdAt + (intervalMs ?? DEFAULT_INITIAL_INTERVAL_MS),
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
    };
  },
};
