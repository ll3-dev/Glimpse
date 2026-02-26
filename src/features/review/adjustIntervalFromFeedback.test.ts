import { describe, expect, test } from 'bun:test';
import {
  calculateAdjustedInterval,
  calculateCurrentInterval,
  calculateNextReviewFromFeedback,
  clampInterval,
  DEFAULT_INITIAL_INTERVAL_MS,
  MAX_INTERVAL_MS,
  MIN_INTERVAL_MS,
} from './adjustIntervalFromFeedback';

describe('adjustIntervalFromFeedback', () => {
  test('calculateCurrentInterval returns review gap when both timestamps exist', () => {
    const lastReviewedAt = 1000;
    const nextReviewAt = 2500;
    expect(calculateCurrentInterval(lastReviewedAt, nextReviewAt)).toBe(1500);
  });

  test('calculateCurrentInterval falls back to default when missing history', () => {
    expect(calculateCurrentInterval(null, null)).toBe(DEFAULT_INITIAL_INTERVAL_MS);
    expect(calculateCurrentInterval(1000, null)).toBe(DEFAULT_INITIAL_INTERVAL_MS);
  });

  test('clampInterval enforces min/max boundaries', () => {
    expect(clampInterval(MIN_INTERVAL_MS - 1)).toBe(MIN_INTERVAL_MS);
    expect(clampInterval(MAX_INTERVAL_MS + 1)).toBe(MAX_INTERVAL_MS);
    expect(clampInterval(7 * 24 * 60 * 60 * 1000)).toBe(7 * 24 * 60 * 60 * 1000);
  });

  test('calculateAdjustedInterval applies remembered multiplier', () => {
    const current = 2 * 24 * 60 * 60 * 1000;
    expect(calculateAdjustedInterval(current, 'remembered')).toBe(4 * 24 * 60 * 60 * 1000);
  });

  test('calculateAdjustedInterval keeps interval for postponed feedback', () => {
    const current = 5 * 24 * 60 * 60 * 1000;
    expect(calculateAdjustedInterval(current, 'postponed')).toBe(current);
  });

  test('calculateNextReviewFromFeedback uses adjusted interval from current time', () => {
    const fixedNow = 1_700_000_000_000;
    const originalNow = Date.now;
    Date.now = () => fixedNow;

    try {
      const result = calculateNextReviewFromFeedback(
        1_699_900_000_000,
        1_699_986_400_000,
        'remembered'
      );

      expect(result.intervalMs).toBe(2 * DEFAULT_INITIAL_INTERVAL_MS);
      expect(result.nextReviewAt).toBe(fixedNow + 2 * DEFAULT_INITIAL_INTERVAL_MS);
    } finally {
      Date.now = originalNow;
    }
  });
});
