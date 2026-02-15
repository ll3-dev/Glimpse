import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

const db = {
  update: mock(),
};

const recommendations = {
  id: 'recommendation_id_col',
};

const eqMock = mock((left: unknown, right: unknown) => ({ left, right }));
const logRecommendationFeedback = mock(async () => ({
  success: true,
}));

mock.module('@/src/db', () => ({
  db,
  recommendations,
}));

mock.module('drizzle-orm', () => ({
  eq: eqMock,
}));

mock.module('./logRecommendationFeedback', () => ({
  logRecommendationFeedback,
}));

const { respondToRecommendation } = await import('./respondToRecommendation');

describe('respondToRecommendation', () => {
  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    db.update.mockReset();
    eqMock.mockClear();
    logRecommendationFeedback.mockReset();
    logRecommendationFeedback.mockResolvedValue({ success: true });
  });

  test('maps accept action to accepted status and logs feedback', async () => {
    const where = mock(async () => undefined);
    const set = mock(() => ({ where }));
    db.update.mockReturnValue({ set });

    const result = await respondToRecommendation('rec-1', 'accept');

    expect(result).toEqual({ success: true, status: 'accepted' });
    expect(logRecommendationFeedback).toHaveBeenCalledWith('rec-1', 'accept');
  });

  test('maps ignore and dismiss actions correctly', async () => {
    const where = mock(async () => undefined);
    const set = mock(() => ({ where }));
    db.update.mockReturnValue({ set });

    const ignored = await respondToRecommendation('rec-2', 'ignore');
    const dismissed = await respondToRecommendation('rec-3', 'dismiss');

    expect(ignored).toEqual({ success: true, status: 'ignored' });
    expect(dismissed).toEqual({ success: true, status: 'dismissed' });
  });

  test('returns DATABASE_ERROR on failure', async () => {
    db.update.mockImplementation(() => {
      throw new Error('update failed');
    });

    const result = await respondToRecommendation('rec-4', 'accept');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
  });
});
