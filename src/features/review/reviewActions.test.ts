import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

const db = {
  select: mock(),
  update: mock(),
};

const knowledgeItems = {
  id: 'id_column',
};

const eqMock = mock((left: unknown, right: unknown) => ({ left, right }));
const calculateNextReviewFromFeedback = mock(() => ({
  intervalMs: 2 * 24 * 60 * 60 * 1000,
  nextReviewAt: 1_700_000_123_000,
}));

mock.module('@/src/db', () => ({
  db,
  knowledgeItems,
}));

mock.module('drizzle-orm', () => ({
  eq: eqMock,
}));

mock.module('./adjustIntervalFromFeedback', () => ({
  calculateNextReviewFromFeedback,
}));

const {
  DEFAULT_POSTPONE_INTERVAL_MS,
  markAsReviewed,
  postponeReview,
} = await import('./reviewActions');

describe('reviewActions', () => {
  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    db.select.mockReset();
    db.update.mockReset();
    eqMock.mockClear();
    calculateNextReviewFromFeedback.mockClear();
    calculateNextReviewFromFeedback.mockReturnValue({
      intervalMs: 2 * 24 * 60 * 60 * 1000,
      nextReviewAt: 1_700_000_123_000,
    });
  });

  test('markAsReviewed returns NOT_FOUND when item does not exist', async () => {
    db.select.mockReturnValue({
      from: mock(() => ({
        where: mock(async () => []),
      })),
    });

    const result = await markAsReviewed('missing-id');

    expect(result).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Item not found',
      },
    });
  });

  test('markAsReviewed updates review schedule and returns updated row', async () => {
    db.select.mockReturnValue({
      from: mock(() => ({
        where: mock(async () => [{ id: 'k1', lastReviewedAt: null, nextReviewAt: null }]),
      })),
    });

    const returning = mock(async () => [{ id: 'k1', nextReviewAt: 1_700_000_123_000 }]);
    const where = mock(() => ({ returning }));
    const set = mock(() => ({ where }));
    db.update.mockReturnValue({ set });

    const result = await markAsReviewed('k1', 'remembered');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('k1');
    }
    expect(calculateNextReviewFromFeedback).toHaveBeenCalledWith(null, null, 'remembered');
  });

  test('postponeReview uses default interval when not provided', async () => {
    db.select.mockReturnValue({
      from: mock(() => ({
        where: mock(async () => [{ id: 'k2', nextReviewAt: null }]),
      })),
    });

    const returning = mock(async () => [{ id: 'k2', nextReviewAt: 1_700_000_000_000 }]);
    const where = mock(() => ({ returning }));
    const set = mock(() => ({ where }));
    db.update.mockReturnValue({ set });

    const result = await postponeReview('k2');

    expect(result.success).toBe(true);
    expect(set).toHaveBeenCalledTimes(1);
    const payload = set.mock.calls[0]?.[0] as { nextReviewAt: number };
    expect(typeof payload.nextReviewAt).toBe('number');
    expect(payload.nextReviewAt).toBeGreaterThanOrEqual(DEFAULT_POSTPONE_INTERVAL_MS);
  });

  test('returns DATABASE_ERROR when update operation throws', async () => {
    db.select.mockReturnValue({
      from: mock(() => ({
        where: mock(async () => [{ id: 'k3', lastReviewedAt: null, nextReviewAt: null }]),
      })),
    });

    db.update.mockImplementation(() => {
      throw new Error('update failed');
    });

    const result = await markAsReviewed('k3');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
  });
});
