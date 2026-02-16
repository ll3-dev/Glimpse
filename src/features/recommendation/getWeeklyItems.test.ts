import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createGetWeeklyItems, type GetWeeklyItemsDeps } from './getWeeklyItems';

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

const deps = {
  db,
  knowledgeItems,
  gte: gteMock,
  desc: descMock,
} as unknown as GetWeeklyItemsDeps;

const getWeeklyItems = createGetWeeklyItems(deps);

describe('getWeeklyItems', () => {
  beforeEach(() => {
    db.select.mockReset();
    gteMock.mockClear();
    descMock.mockClear();
  });

  test('returns recent items on success', async () => {
    const items = [{ id: 'a' }, { id: 'b' }] as any;
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
    if (result.success === false) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
  });
});
