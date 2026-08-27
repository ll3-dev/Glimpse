import { describe, expect, test } from 'bun:test';
import {
  calculateNextReviewFromFeedback,
  calculateNextReviewState,
  clampInterval,
  MAX_INTERVAL_MS,
  MIN_INTERVAL_MS,
} from './adjustIntervalFromFeedback';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('adjustIntervalFromFeedback (FSRS-lite)', () => {
  test('clampInterval enforces min/max boundaries', () => {
    expect(clampInterval(MIN_INTERVAL_MS - 1)).toBe(MIN_INTERVAL_MS);
    expect(clampInterval(MAX_INTERVAL_MS + 1)).toBe(MAX_INTERVAL_MS);
    expect(clampInterval(7 * DAY_MS)).toBe(7 * DAY_MS);
  });

  test('remembered grows stability, eases difficulty, extends interval', () => {
    const now = 100 * DAY_MS;
    const result = calculateNextReviewState(
      96 * DAY_MS, // reviewed 4 days ago
      97 * DAY_MS, // was due 1 day after
      'remembered',
      now,
      { stabilityDays: 3.0, difficulty: 6.0 },
    );
    expect(result.stability).toBeGreaterThan(3.0);
    expect(result.difficulty).toBeLessThan(6.0);
    expect(result.intervalMs).toBeGreaterThan(3 * DAY_MS);
    expect(result.nextReviewAt).toBe(now + result.intervalMs);
  });

  test('forgotten contracts stability, raises difficulty, shortens interval', () => {
    const now = 100 * DAY_MS;
    const result = calculateNextReviewState(
      90 * DAY_MS,
      95 * DAY_MS,
      'forgotten',
      now,
      { stabilityDays: 10.0, difficulty: 3.0 },
    );
    expect(result.stability).toBeLessThan(10.0);
    expect(result.difficulty).toBeGreaterThan(3.0);
    expect(result.intervalMs).toBeLessThan(10 * DAY_MS);
  });

  test('postponed keeps memory state and pushes the same interval forward', () => {
    const now = 100 * DAY_MS;
    const scheduled = 2 * DAY_MS;
    const result = calculateNextReviewState(
      98 * DAY_MS,
      98 * DAY_MS + scheduled,
      'postponed',
      now,
      { stabilityDays: 4.0, difficulty: 5.0 },
    );
    expect(result.stability).toBe(4.0);
    expect(result.difficulty).toBe(5.0);
    expect(result.intervalMs).toBe(scheduled);
    expect(result.nextReviewAt).toBe(now + scheduled);
  });

  test('consecutive recall monotonically extends intervals', () => {
    let stability = 0.5;
    let lastInterval = 0;
    for (let i = 0; i < 6; i += 1) {
      const now = 10 * DAY_MS + lastInterval;
      const result = calculateNextReviewState(
        now - lastInterval,
        now,
        'remembered',
        now,
        { stabilityDays: stability, difficulty: 5.0 },
      );
      expect(result.intervalMs).toBeGreaterThan(lastInterval);
      lastInterval = result.intervalMs;
      stability = result.stability;
    }
  });

  test('calculateNextReviewFromFeedback returns the same decision shape', () => {
    const fixedNow = 1_700_000_000_000;
    const result = calculateNextReviewFromFeedback(null, null, 'remembered', fixedNow);
    expect(result.intervalMs).toBeGreaterThan(0);
    expect(result.nextReviewAt).toBe(fixedNow + result.intervalMs);
    expect(typeof result.stability).toBe('number');
    expect(typeof result.difficulty).toBe('number');
  });
});
