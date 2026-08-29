/**
 * Pure state-machine tests for the adaptive poll schedule: idle polls back
 * off geometrically up to a ceiling, any change resets to the base interval,
 * and local revision changes debounce into a single sync attempt.
 */
import { describe, expect, test } from 'bun:test';
import {
  BASE_POLL_MS,
  CHANGE_DEBOUNCE_MS,
  MAX_POLL_MS,
  nextPollIntervalMs,
  shouldAttemptAfterLocalChange,
} from './sync-schedule';

describe('adaptive poll interval', () => {
  test('base interval is 60s, ceiling 5 minutes', () => {
    expect(BASE_POLL_MS).toBe(60_000);
    expect(MAX_POLL_MS).toBe(5 * 60_000);
  });

  test('a changed poll resets to the base interval', () => {
    expect(nextPollIntervalMs(240_000, true)).toBe(BASE_POLL_MS);
  });

  test('idle polls double up to the ceiling', () => {
    expect(nextPollIntervalMs(60_000, false)).toBe(120_000);
    expect(nextPollIntervalMs(120_000, false)).toBe(240_000);
    expect(nextPollIntervalMs(240_000, false)).toBe(300_000, 'doubles past the ceiling clamp to it');
  });

  test('the ceiling is never exceeded', () => {
    let interval = BASE_POLL_MS;
    for (let i = 0; i < 20; i += 1) {
      interval = nextPollIntervalMs(interval, false);
      expect(interval).toBeLessThanOrEqual(MAX_POLL_MS);
    }
    expect(interval).toBe(MAX_POLL_MS, 'idle saturation lands on the ceiling');
  });
});

describe('local-change debounce gate', () => {
  test('first change schedules a debounced attempt', () => {
    expect(shouldAttemptAfterLocalChange(null, 10_000, CHANGE_DEBOUNCE_MS)).toBe(true);
  });

  test('a change inside the debounce window does not re-arm', () => {
    // The pending timer from the 10s change is still in its window at 11s.
    expect(shouldAttemptAfterLocalChange(10_000, 11_000, 2_000)).toBe(false);
  });

  test('a change after the window re-arms', () => {
    expect(shouldAttemptAfterLocalChange(10_000, 13_500, 2_000)).toBe(true);
  });

  test('sync completion clears the pending marker', () => {
    expect(shouldAttemptAfterLocalChange(null, 99_000, 2_000)).toBe(true);
  });
});
