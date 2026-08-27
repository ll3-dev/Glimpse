import { describe, expect, test } from 'bun:test';
import { backoffDurationMs, backoffRetryAfterMs, MAX_BACKOFF_MS } from './backoff';

describe('backoffDurationMs', () => {
  test('first failure waits one base interval', () => {
    expect(backoffDurationMs(1)).toBe(60_000);
  });

  test('doubles per additional failure', () => {
    expect(backoffDurationMs(2)).toBe(120_000);
    expect(backoffDurationMs(3)).toBe(240_000);
  });

  test('clamps at the max', () => {
    expect(backoffDurationMs(10)).toBe(MAX_BACKOFF_MS);
  });

  test('zero or negative failures still wait one base interval', () => {
    expect(backoffDurationMs(0)).toBe(60_000);
    expect(backoffDurationMs(-3)).toBe(60_000);
  });
});

describe('backoffRetryAfterMs', () => {
  test('adds the duration to the failure timestamp', () => {
    expect(backoffRetryAfterMs(1, 1_000)).toBe(61_000);
    expect(backoffRetryAfterMs(2, 1_000)).toBe(121_000);
  });
});
