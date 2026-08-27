import { describe, expect, test } from 'bun:test';
import {
  backoffDurationMs,
  createBackoffController,
  isHoldingOff,
  MAX_BACKOFF_MS,
  recordFailure,
  recordSuccess,
} from './backoff';

describe('sync backoff controller', () => {
  test('fresh state never holds off', () => {
    const state = createBackoffController();
    expect(isHoldingOff(state, 1_000)).toBe(false);
  });

  test('failure holds off exponentially and caps at the maximum', () => {
    let state = recordFailure(createBackoffController(), 1_000);
    expect(state.holdUntil).toBe(1_000 + 60_000);

    const secondAt = state.holdUntil;
    state = recordFailure(state, secondAt);
    expect(state.holdUntil).toBe(secondAt + 120_000);

    // Many failures stay capped.
    for (let i = 0; i < 12; i += 1) {
      state = recordFailure(state, state.holdUntil);
    }
    expect(backoffDurationMs(state.failures)).toBe(MAX_BACKOFF_MS);
    expect(isHoldingOff(state, state.holdUntil - 1)).toBe(true);
  });

  test('success resets the hold', () => {
    let state = recordFailure(createBackoffController(), 0);
    state = recordSuccess(state);
    expect(state.failures).toBe(0);
    expect(isHoldingOff(state, 1)).toBe(false);
  });

  test('auth rejection freezes retries until re-pairing resets the controller', () => {
    let state = recordFailure(createBackoffController(), 0, true);
    expect(state.invalidated).toBe(true);
    // Even far in the future, auto sync holds.
    expect(isHoldingOff(state, 10_000_000_000)).toBe(true);
    // But a forced (manual) sync ignores it.
    expect(isHoldingOff(state, 10_000_000_000, { force: true })).toBe(false);
    // Ordinary failures after invalidation stay invalidated.
    state = recordFailure(state, 5_000, false);
    expect(state.invalidated).toBe(true);
    // Re-pairing creates a fresh controller.
    expect(isHoldingOff(createBackoffController(), 0)).toBe(false);
  });
});
