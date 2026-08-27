/**
 * Adjust Interval From Feedback
 *
 * FSRS-lite spaced repetition — the single scheduler source shared by mobile,
 * desktop and the in-memory fallback client. Stability is how long the memory
 * lasts (days) at ~90% recall; difficulty is a 1..=10 per-item resistance
 * measure.
 */

import type { CalculateNextReviewInput, ReviewFeedbackType } from '@glimpse/shared';

export type { ReviewFeedbackType };

export const MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_INTERVAL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year
export const DEFAULT_INITIAL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
/** Upper bound for stability (days): keeps extreme f64 values (e.g. Infinity)
 * out of persistence — JSON.stringify would serialize Infinity as null. */
export const MAX_STABILITY_DAYS = 365 * 5;

const INITIAL_STABILITY_DAYS = 0.5;
const INITIAL_DIFFICULTY = 5.0;
const MIN_DIFFICULTY = 1.0;
const MAX_DIFFICULTY = 10.0;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface MemoryState {
  stabilityDays: number;
  difficulty: number;
}

/** Scheduler decision: when to review next and the item's updated memory state. */
export interface NextReviewDecision {
  intervalMs: number;
  nextReviewAt: number;
  stability: number;
  difficulty: number;
}

/** Clamps stability to a finite upper bound so persisted state stays serializable. */
export function clampStability(stabilityDays: number): number {
  if (!Number.isFinite(stabilityDays) || stabilityDays > MAX_STABILITY_DAYS) {
    return MAX_STABILITY_DAYS;
  }
  return stabilityDays;
}

export function clampInterval(intervalMs: number): number {
  return Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, Math.round(intervalMs)));
}

function elapsedDays(
  lastReviewedAt: number | null,
  nextReviewAt: number | null,
  now: number,
  stabilityDays: number,
): number {
  if (lastReviewedAt === null || nextReviewAt === null) return 0;
  // Real elapsed time strengthens memory, but contribution is capped at twice
  // the current stability (in ms): a successful long-overdue review counts for
  // more than an on-time one, while a semester-late cram does not grow stale.
  const maxContributionMs = Math.max(stabilityDays * 2 * DAY_MS, 1);
  const elapsedMs = Math.min(now - lastReviewedAt, maxContributionMs);
  return Math.max(elapsedMs, 0) / DAY_MS;
}

export function calculateNextReviewState(
  lastReviewedAt: number | null,
  nextReviewAt: number | null,
  feedbackType: ReviewFeedbackType,
  now: number = Date.now(),
  memory: MemoryState = {
    stabilityDays: INITIAL_STABILITY_DAYS,
    difficulty: INITIAL_DIFFICULTY,
  },
): NextReviewDecision {
  const elapsed = elapsedDays(lastReviewedAt, nextReviewAt, now, memory.stabilityDays);

  if (feedbackType === 'postponed') {
    const interval =
      lastReviewedAt !== null && nextReviewAt !== null
        ? Math.max(nextReviewAt - lastReviewedAt, 0)
        : DEFAULT_INITIAL_INTERVAL_MS;
    const intervalMs = clampInterval(Math.max(interval, DEFAULT_INITIAL_INTERVAL_MS));
    return {
      intervalMs,
      nextReviewAt: now + intervalMs,
      stability: clampStability(memory.stabilityDays),
      difficulty: memory.difficulty,
    };
  }

  if (feedbackType === 'forgotten') {
    const stabilityDays = clampStability(
      Math.max(memory.stabilityDays * 0.35, INITIAL_STABILITY_DAYS * 0.6),
    );
    const difficulty = Math.min(memory.difficulty + 1.5, MAX_DIFFICULTY);
    const intervalMs = clampInterval(stabilityDays * DAY_MS);
    return {
      intervalMs,
      nextReviewAt: now + intervalMs,
      stability: stabilityDays,
      difficulty,
    };
  }

  // remembered
  const baseDays = Math.max(elapsed, clampStability(memory.stabilityDays), 0.5);
  const difficultyPenalty = Math.max(1 + (memory.difficulty - 5) / 20, 0.3);
  const stabilityDays = clampStability(
    Math.max(baseDays * 1.9 * difficultyPenalty, memory.stabilityDays, 0.5),
  );
  const difficulty = Math.max(memory.difficulty - 0.5, MIN_DIFFICULTY);
  const intervalMs = clampInterval(stabilityDays * DAY_MS);
  return {
    intervalMs,
    nextReviewAt: now + intervalMs,
    stability: stabilityDays,
    difficulty,
  };
}

/** Back-compat shim for callers that only need the interval. */
export function calculateNextReviewFromFeedback(
  lastReviewedAt: number | null,
  nextReviewAt: number | null,
  feedbackType: ReviewFeedbackType,
  now: number = Date.now(),
  memory?: MemoryState,
): NextReviewDecision {
  return calculateNextReviewState(lastReviewedAt, nextReviewAt, feedbackType, now, memory);
}

export function toCoreInput(
  lastReviewedAt: number | null,
  nextReviewAt: number | null,
  feedbackType: ReviewFeedbackType,
  now: number,
  memory?: MemoryState,
): CalculateNextReviewInput {
  return {
    lastReviewedAt,
    nextReviewAt,
    feedbackType,
    now,
    stability: memory?.stabilityDays ?? null,
    difficulty: memory?.difficulty ?? null,
  };
}
