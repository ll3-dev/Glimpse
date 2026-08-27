import { describe, expect, test } from 'bun:test';
import {
  calculateNextReviewState,
  clampInterval,
  MAX_INTERVAL_MS,
  MAX_STABILITY_DAYS,
  MIN_INTERVAL_MS,
} from './adjustIntervalFromFeedback';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('adjustIntervalFromFeedback (FSRS-lite)', () => {
  test('golden: fixed input produces fixed interval/stability/difficulty', () => {
    // Anchor the shared scheduler so any accidental formula drift breaks CI.
    const remembered = calculateNextReviewState(0, DAY_MS, 'remembered', DAY_MS, {
      stabilityDays: 1.0,
      difficulty: 5.0,
    });
    // elapsed = 1 day (<= stability*2 cap) -> base 1 -> stability 1.9
    expect(remembered.intervalMs).toBe(Math.round(1.9 * DAY_MS));
    expect(remembered.stability).toBeCloseTo(1.9, 12);
    expect(remembered.difficulty).toBeCloseTo(4.5, 12);
    expect(remembered.nextReviewAt).toBe(DAY_MS + remembered.intervalMs);

    const forgotten = calculateNextReviewState(0, DAY_MS, 'forgotten', DAY_MS, {
      stabilityDays: 10.0,
      difficulty: 3.0,
    });
    // stability contracts to max(10*0.35, 0.3) = 3.5, difficulty rises to 4.5
    expect(forgotten.intervalMs).toBe(Math.round(3.5 * DAY_MS));
    expect(forgotten.stability).toBeCloseTo(3.5, 12);
    expect(forgotten.difficulty).toBeCloseTo(4.5, 12);

    const postponed = calculateNextReviewState(0, DAY_MS, 'postponed', 5 * DAY_MS, {
      stabilityDays: 4.0,
      difficulty: 5.0,
    });
    expect(postponed.intervalMs).toBe(DAY_MS);
    expect(postponed.stability).toBe(4.0);
    expect(postponed.difficulty).toBe(5.0);
    expect(postponed.nextReviewAt).toBe(5 * DAY_MS + DAY_MS);
  });

  test('clampInterval enforces min/max boundaries', () => {
    expect(clampInterval(MIN_INTERVAL_MS - 1)).toBe(MIN_INTERVAL_MS);
    expect(clampInterval(MAX_INTERVAL_MS + 1)).toBe(MAX_INTERVAL_MS);
    expect(clampInterval(7 * DAY_MS)).toBe(7 * DAY_MS);
  });

  test('MAX_STABILITY_DAYS caps extreme stability (f64 infinity defense)', () => {
    expect(MAX_STABILITY_DAYS).toBe(365 * 5);

    const inf = calculateNextReviewState(0, DAY_MS, 'remembered', DAY_MS, {
      stabilityDays: Number.POSITIVE_INFINITY,
      difficulty: 5.0,
    });
    expect(Number.isFinite(inf.stability)).toBe(true);
    expect(inf.stability).toBe(MAX_STABILITY_DAYS);
    expect(inf.intervalMs).toBeLessThanOrEqual(MAX_INTERVAL_MS);

    const bigFinite = calculateNextReviewState(0, DAY_MS, 'remembered', DAY_MS, {
      stabilityDays: 1e12,
      difficulty: 1.0,
    });
    expect(bigFinite.stability).toBe(MAX_STABILITY_DAYS);

    const infLapse = calculateNextReviewState(0, DAY_MS, 'forgotten', DAY_MS, {
      stabilityDays: Number.POSITIVE_INFINITY,
      difficulty: 5.0,
    });
    expect(infLapse.stability).toBe(MAX_STABILITY_DAYS);
    expect(Number.isFinite(infLapse.intervalMs)).toBe(true);
  });

  test('long-overdue successful recall strengthens more than on-time recall', () => {
    // The same item graded once exactly on schedule and once far past due:
    // real elapsed time must contribute (up to stability*2), otherwise the
    // elapsed parameter is dead weight.
    const onTime = calculateNextReviewState(0, DAY_MS, 'remembered', DAY_MS, {
      stabilityDays: 3.0,
      difficulty: 5.0,
    });
    const tenDaysLate = calculateNextReviewState(0, DAY_MS, 'remembered', 11 * DAY_MS, {
      stabilityDays: 3.0,
      difficulty: 5.0,
    });
    expect(tenDaysLate.stability).toBeGreaterThan(onTime.stability);
    expect(tenDaysLate.intervalMs).toBeGreaterThan(onTime.intervalMs);

    // Contribution is capped at twice the current stability (3 -> 6 days).
    const monthLate = calculateNextReviewState(0, DAY_MS, 'remembered', 31 * DAY_MS, {
      stabilityDays: 3.0,
      difficulty: 5.0,
    });
    expect(monthLate.stability).toBe(tenDaysLate.stability);
  });

  test('remembered grows stability, eases difficulty, extends interval', () => {
    const now = 100 * DAY_MS;
    const result = calculateNextReviewState(96 * DAY_MS, 97 * DAY_MS, 'remembered', now, {
      stabilityDays: 3.0,
      difficulty: 6.0,
    });
    expect(result.stability).toBeGreaterThan(3.0);
    expect(result.difficulty).toBeLessThan(6.0);
    expect(result.intervalMs).toBeGreaterThan(3 * DAY_MS);
    expect(result.nextReviewAt).toBe(now + result.intervalMs);
  });

  test('forgotten contracts stability, raises difficulty, shortens interval', () => {
    const now = 100 * DAY_MS;
    const result = calculateNextReviewState(90 * DAY_MS, 95 * DAY_MS, 'forgotten', now, {
      stabilityDays: 10.0,
      difficulty: 3.0,
    });
    expect(result.stability).toBeLessThan(10.0);
    expect(result.difficulty).toBeGreaterThan(3.0);
    expect(result.intervalMs).toBeLessThan(10 * DAY_MS);
  });

  test('consecutive recall monotonically extends intervals', () => {
    let stability = 0.5;
    let lastInterval = 0;
    for (let i = 0; i < 6; i += 1) {
      const now = 10 * DAY_MS + lastInterval;
      const result = calculateNextReviewState(now - lastInterval, now, 'remembered', now, {
        stabilityDays: stability,
        difficulty: 5.0,
      });
      expect(result.intervalMs).toBeGreaterThan(lastInterval);
      lastInterval = result.intervalMs;
      stability = result.stability;
    }
  });

  test('first review bootstraps from the initial state', () => {
    const fixedNow = 1_700_000_000_000;
    const result = calculateNextReviewState(null, null, 'remembered', fixedNow);
    expect(result.intervalMs).toBeGreaterThan(0);
    expect(result.nextReviewAt).toBe(fixedNow + result.intervalMs);
    expect(typeof result.stability).toBe('number');
    expect(typeof result.difficulty).toBe('number');
  });
});
