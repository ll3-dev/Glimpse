import { beforeEach, describe, expect, mock, test } from 'bun:test';

mock.module('react-native', () => ({
  NativeModules: {},
}));

const { nativeCoreClient } = await import('./native-core-client.native');

describe('nativeCoreClient local review calculations', () => {
  beforeEach(() => {
    // rustra bootstrap fails in tests (no NativeModules.RustraJSI), so the
    // delegate falls back to the in-memory client — mirroring the Expo Go
    // path.
  });

  test('calculates tag overlap locally', async () => {
    await expect(
      nativeCoreClient.calculateTagOverlap({
        left: { tags: ['a', 'b'] },
        right: { tags: ['b', 'c'] },
      })
    ).resolves.toBeCloseTo(1 / 3);
  });

  test('initializes review schedule locally', async () => {
    await expect(
      nativeCoreClient.initializeReviewSchedule({
        createdAt: 10,
      })
    ).resolves.toEqual({
      nextReviewAt: 10 + 24 * 60 * 60 * 1000,
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
    });
  });

  test('calculates next review from provided now value', async () => {
    const output = await nativeCoreClient.calculateNextReview({
      lastReviewedAt: 0,
      nextReviewAt: 24 * 60 * 60 * 1000,
      feedbackType: 'remembered',
      now: 100,
    });
    // FSRS-lite: remembered grows stability from the initial state.
    expect(output.intervalMs).toBeGreaterThan(0);
    expect(output.nextReviewAt).toBe(100 + output.intervalMs);
    expect(output.stability).toBeGreaterThan(0);
    expect(output.difficulty).toBeLessThan(5.0);
  });
});
