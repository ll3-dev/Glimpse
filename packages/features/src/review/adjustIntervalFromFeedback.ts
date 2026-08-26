/**
 * Adjust Interval From Feedback
 *
 * FSRS-lite spaced repetition: mirrors packages/core-rust
 * calculate_next_review so both sides of the bridge schedule identically.
 * Stability is how long the memory lasts (days) at ~90% recall; difficulty is
 * a 1..=10 per-item resistance measure.
 */

import type { CalculateNextReviewInput, ReviewFeedbackType } from '@glimpse/shared';

export type { ReviewFeedbackType };

export const MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_INTERVAL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year
export const DEFAULT_INITIAL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

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

export function clampInterval(intervalMs: number): number {
  return Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, Math.round(intervalMs)));
}

function elapsedDays(lastReviewedAt: number | null, nextReviewAt: number | null, now: number): number {
  if (lastReviewedAt === null || nextReviewAt === null) return 0;
  const scheduled = Math.max(nextReviewAt - lastReviewedAt, 1);
  return Math.max(Math.min(now - lastReviewedAt, scheduled), 0) / DAY_MS;
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
  const elapsed = elapsedDays(lastReviewedAt, nextReviewAt, now);

  if (feedbackType === 'postponed') {
    const interval =
      lastReviewedAt !== null && nextReviewAt !== null
        ? Math.max(nextReviewAt - lastReviewedAt, 0)
        : DEFAULT_INITIAL_INTERVAL_MS;
    const intervalMs = clampInterval(Math.max(interval, DEFAULT_INITIAL_INTERVAL_MS));
    return {
      intervalMs,
      nextReviewAt: now + intervalMs,
      stability: memory.stabilityDays,
      difficulty: memory.difficulty,
    };
  }

  if (feedbackType === 'forgotten') {
    const stabilityDays = Math.max(
      memory.stabilityDays * 0.35,
      INITIAL_STABILITY_DAYS * 0.6,
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
  const baseDays = Math.max(elapsed, memory.stabilityDays, 0.5);
  const difficultyPenalty = Math.max(1 + (memory.difficulty - 5) / 20, 0.3);
  const stabilityDays = Math.max(baseDays * 1.9 * difficultyPenalty, memory.stabilityDays, 0.5);
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
