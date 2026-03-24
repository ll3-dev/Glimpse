import { beforeEach, describe, expect, mock, test } from 'bun:test';

const bridge = {
  calculateTagOverlap: mock((_left: string[] | undefined, _right: string[] | undefined) => 0),
  calculateNextReview: mock(
    (
      _lastReviewedAt: number | undefined,
      _nextReviewAt: number | undefined,
      _feedbackType: string,
      _now: number
    ) => ({ intervalMs: 0, nextReviewAt: 0 })
  ),
  initializeReviewSchedule: mock(
    (_createdAt: number, _intervalMs: number | undefined) => ({
      nextReviewAt: 0,
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
    })
  ),
  getDueKnowledgeItemsJson: mock((_now: number, _limit: number | undefined) => '[]'),
};

mock.module('@glimpse/mobile-core-module', () => ({
  GlimpseCore: bridge,
}));

const { nativeCoreClient } = await import('./native-core-client.native');

describe('nativeCoreClient Nitro optional conversion', () => {
  beforeEach(() => {
    Object.values(bridge).forEach((fn) => {
      if ('mockClear' in fn && typeof fn.mockClear === 'function') {
        fn.mockClear();
      }
    });
  });

  test('converts null string arrays to undefined for calculateTagOverlap', () => {
    nativeCoreClient.calculateTagOverlap({
      left: { tags: null },
      right: { tags: ['a'] },
    });

    expect(bridge.calculateTagOverlap).toHaveBeenCalledWith(undefined, ['a']);
  });

  test('converts null numbers to undefined for calculateNextReview', () => {
    nativeCoreClient.calculateNextReview({
      lastReviewedAt: null,
      nextReviewAt: null,
      feedbackType: 'again',
      now: 10,
    });

    expect(bridge.calculateNextReview).toHaveBeenCalledWith(
      undefined,
      undefined,
      'again',
      10
    );
  });

  test('converts null interval to undefined for initializeReviewSchedule', () => {
    nativeCoreClient.initializeReviewSchedule({
      createdAt: 10,
      intervalMs: null,
    });

    expect(bridge.initializeReviewSchedule).toHaveBeenCalledWith(10, undefined);
  });

  test('converts null limit to undefined for getDueKnowledgeItemsJson', () => {
    nativeCoreClient.getDueKnowledgeItemsJson(10, null);

    expect(bridge.getDueKnowledgeItemsJson).toHaveBeenCalledWith(10, undefined);
  });
});
