import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createRespondToRecommendation,
  type RespondToRecommendationDeps,
} from './respondToRecommendation';

const db = {
  batch: mock(),
  update: mock(),
  insert: mock(),
};

const recommendations = {
  id: 'recommendation_id_col',
};

const feedbackEvents = {
  recommendationId: 'feedback_recommendation_id_col',
};

const eqMock = mock((left: unknown, right: unknown) => ({ left, right }));
const nanoidMock = mock(() => 'event-1');

const deps = {
  db,
  recommendations,
  feedbackEvents,
  eq: eqMock,
  nanoid: nanoidMock,
} as unknown as RespondToRecommendationDeps;

const respondToRecommendation = createRespondToRecommendation(deps);

describe('respondToRecommendation', () => {
  beforeEach(() => {
    db.batch.mockReset();
    db.update.mockReset();
    db.insert.mockReset();
    eqMock.mockClear();
    nanoidMock.mockClear();
    nanoidMock.mockReturnValue('event-1');
  });

  test('maps accept action to accepted status and persists feedback in one batch', async () => {
    const where = mock(() => 'update-query');
    const set = mock(() => ({ where }));
    const values = mock(() => 'insert-query');
    db.update.mockReturnValue({ set });
    db.insert.mockReturnValue({ values });
    db.batch.mockResolvedValue([]);

    const result = await respondToRecommendation('rec-1', 'accept');

    expect(result).toEqual({ success: true, status: 'accepted' });
    expect(db.batch).toHaveBeenCalledWith(['update-query', 'insert-query']);
  });

  test('maps ignore and dismiss actions correctly', async () => {
    const where = mock(() => 'update-query');
    const set = mock(() => ({ where }));
    const values = mock(() => 'insert-query');
    db.update.mockReturnValue({ set });
    db.insert.mockReturnValue({ values });
    db.batch.mockResolvedValue([]);

    const ignored = await respondToRecommendation('rec-2', 'ignore');
    const dismissed = await respondToRecommendation('rec-3', 'dismiss');

    expect(ignored).toEqual({ success: true, status: 'ignored' });
    expect(dismissed).toEqual({ success: true, status: 'dismissed' });
  });

  test('returns DATABASE_ERROR on failure', async () => {
    db.batch.mockRejectedValue(new Error('batch failed'));

    const result = await respondToRecommendation('rec-4', 'accept');

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
  });
});
