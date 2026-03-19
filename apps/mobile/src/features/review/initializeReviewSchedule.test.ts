import { describe, expect, test } from 'bun:test';
import {
  calculateInitialReviewAt,
  DEFAULT_INITIAL_REVIEW_INTERVAL_MS,
  initializeReviewSchedule,
} from './initializeReviewSchedule';

describe('initializeReviewSchedule', () => {
  test('calculateInitialReviewAt uses default interval', () => {
    const createdAt = 1_700_000_000_000;
    expect(calculateInitialReviewAt(createdAt)).toBe(
      createdAt + DEFAULT_INITIAL_REVIEW_INTERVAL_MS
    );
  });

  test('calculateInitialReviewAt uses custom interval when provided', () => {
    const createdAt = 1_700_000_000_000;
    const intervalMs = 3 * 24 * 60 * 60 * 1000;
    expect(calculateInitialReviewAt(createdAt, intervalMs)).toBe(createdAt + intervalMs);
  });

  test('initializeReviewSchedule returns expected default review fields', () => {
    const createdAt = 1_700_000_000_000;
    const schedule = initializeReviewSchedule(createdAt);

    expect(schedule).toEqual({
      nextReviewAt: createdAt + DEFAULT_INITIAL_REVIEW_INTERVAL_MS,
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
    });
  });
});
