import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

const db = {
  select: mock(),
};

const knowledgeItems = {
  createdAt: 'created_at_col',
};

const gteMock = mock((column: unknown, value: unknown) => ({
  type: 'gte',
  column,
  value,
}));
const descMock = mock((column: unknown) => ({ type: 'desc', column }));

mock.module('@/src/db', () => ({
  db,
  knowledgeItems,
}));

mock.module('drizzle-orm', () => ({
  gte: gteMock,
  desc: descMock,
}));

const { getWeeklyItems } = await import('./getWeeklyItems');

describe('getWeeklyItems', () => {
  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    db.select.mockReset();
    gteMock.mockClear();
    descMock.mockClear();
  });

  test('returns recent items on success', async () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const query = {
      from: mock(),
      where: mock(),
      orderBy: mock(),
    };
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockResolvedValue(items);
    db.select.mockReturnValue(query);

    const result = await getWeeklyItems();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(items);
    }
    expect(gteMock).toHaveBeenCalledTimes(1);
    expect(descMock).toHaveBeenCalledTimes(1);
  });

  test('returns DATABASE_ERROR when query fails', async () => {
    const query = {
      from: mock(),
      where: mock(),
      orderBy: mock(),
    };
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockRejectedValue(new Error('query failed'));
    db.select.mockReturnValue(query);

    const result = await getWeeklyItems();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
  });
});
