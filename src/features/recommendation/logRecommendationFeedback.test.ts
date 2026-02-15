import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

const insertValues = mock(async () => undefined);
const db = {
  insert: mock(() => ({ values: insertValues })),
  select: mock(),
};

const feedbackEvents = {
  createdAt: 'created_at_col',
};

const descMock = mock((column: unknown) => ({ type: 'desc', column }));
const nanoid = mock(() => 'feedback-id');

mock.module('@/src/db', () => ({
  db,
  feedbackEvents,
}));

mock.module('drizzle-orm', () => ({
  desc: descMock,
}));

mock.module('nanoid', () => ({
  nanoid,
}));

const {
  getRecentFeedbackEvents,
  logRecommendationFeedback,
} = await import('./logRecommendationFeedback');

describe('logRecommendationFeedback', () => {
  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    db.insert.mockClear();
    db.select.mockReset();
    insertValues.mockReset();
    insertValues.mockResolvedValue(undefined);
    descMock.mockClear();
    nanoid.mockClear();
  });

  test('writes feedback event and returns it', async () => {
    const result = await logRecommendationFeedback('rec-1', 'accept');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.event.id).toBe('feedback-id');
      expect(result.event.recommendationId).toBe('rec-1');
      expect(result.event.action).toBe('accept');
    }
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledTimes(1);
  });

  test('returns DATABASE_ERROR when insert fails', async () => {
    insertValues.mockRejectedValue(new Error('insert failed'));

    const result = await logRecommendationFeedback('rec-2', 'ignore');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
  });

  test('returns recent feedback events with limit', async () => {
    const events = [{ id: 'e1' }, { id: 'e2' }];
    const limit = mock(async () => events);
    const orderBy = mock(() => ({ limit }));
    const from = mock(() => ({ orderBy }));
    db.select.mockReturnValue({ from });

    const result = await getRecentFeedbackEvents(2);

    expect(result).toEqual({ success: true, data: events });
    expect(descMock).toHaveBeenCalledTimes(1);
    expect(limit).toHaveBeenCalledWith(2);
  });

  test('returns DATABASE_ERROR when reading recent events fails', async () => {
    db.select.mockImplementation(() => {
      throw new Error('read failed');
    });

    const result = await getRecentFeedbackEvents();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
  });
});
