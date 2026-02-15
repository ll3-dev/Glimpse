import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

const db = {
  select: mock(),
  update: mock(),
};

const knowledgeItems = {
  nextReviewAt: 'next_review_at_col',
  id: {
    eq: (value: string) => ({ type: 'eq', value }),
  },
};

const isNullMock = mock((column: unknown) => ({ type: 'isNull', column }));

mock.module('@/src/db', () => ({
  db,
  knowledgeItems,
}));

mock.module('drizzle-orm', () => ({
  isNull: isNullMock,
}));

const { batchInitializeReviewSchedules } = await import('./initializeReviewSchedule');

describe('batchInitializeReviewSchedules', () => {
  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    db.select.mockReset();
    db.update.mockReset();
    isNullMock.mockClear();
  });

  test('returns 0 when there are no items to initialize', async () => {
    db.select.mockReturnValue({
      from: mock(() => ({
        where: mock(async () => []),
      })),
    });

    const updatedCount = await batchInitializeReviewSchedules();

    expect(updatedCount).toBe(0);
    expect(db.update).not.toHaveBeenCalled();
  });

  test('updates each item missing nextReviewAt', async () => {
    db.select.mockReturnValue({
      from: mock(() => ({
        where: mock(async () => [
          { id: 'a', createdAt: 1_700_000_000_000 },
          { id: 'b', createdAt: 1_700_100_000_000 },
        ]),
      })),
    });

    const where = mock(async () => undefined);
    const set = mock(() => ({ where }));
    db.update.mockReturnValue({ set });

    const updatedCount = await batchInitializeReviewSchedules(1_000);

    expect(updatedCount).toBe(2);
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenCalledTimes(2);
  });

  test('rethrows when initialization query fails', async () => {
    db.select.mockImplementation(() => {
      throw new Error('db unavailable');
    });

    await expect(batchInitializeReviewSchedules()).rejects.toThrow('db unavailable');
  });
});
