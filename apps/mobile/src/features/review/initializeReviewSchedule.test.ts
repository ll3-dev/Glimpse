import { describe, expect, test } from 'bun:test';
import {
  calculateInitialReviewAt,
  DEFAULT_INITIAL_REVIEW_INTERVAL_MS,
} from './initializeReviewSchedule';

// Note: initializeReviewSchedule is a thin wrapper around mobileCoreClient.initializeReviewSchedule
// The actual logic is tested in Rust (packages/core-rs)

describe('calculateInitialReviewAt', () => {
  test('uses default interval', () => {
    const createdAt = 1_700_000_000_000;
    expect(calculateInitialReviewAt(createdAt)).toBe(
      createdAt + DEFAULT_INITIAL_REVIEW_INTERVAL_MS
    );
  });

  test('uses custom interval when provided', () => {
    const createdAt = 1_700_000_000_000;
    const intervalMs = 3 * 24 * 60 * 60 * 1000;
    expect(calculateInitialReviewAt(createdAt, intervalMs)).toBe(createdAt + intervalMs);
  });
});
