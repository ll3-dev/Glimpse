import { describe, expect, test } from 'bun:test';
import { nativeCoreClient } from './native-core-client.native';

describe('nativeCoreClient local review calculations', () => {
  test('calculates tag overlap locally', () => {
    expect(
      nativeCoreClient.calculateTagOverlap({
        left: { tags: ['a', 'b'] },
        right: { tags: ['b', 'c'] },
      })
    ).toBeCloseTo(1 / 3);
  });

  test('initializes review schedule locally', () => {
    expect(
      nativeCoreClient.initializeReviewSchedule({
        createdAt: 10,
      })
    ).toEqual({
      nextReviewAt: 10 + 24 * 60 * 60 * 1000,
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
    });
  });

  test('calculates next review from provided now value', () => {
    expect(
      nativeCoreClient.calculateNextReview({
        lastReviewedAt: 0,
        nextReviewAt: 24 * 60 * 60 * 1000,
        feedbackType: 'remembered',
        now: 100,
      })
    ).toEqual({
      intervalMs: 24 * 60 * 60 * 1000,
      nextReviewAt: 100 + 24 * 60 * 60 * 1000,
    });
  });
});
