import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

const db = {
  select: mock(),
};

const knowledgeItems = {
  createdAt: 'created_at_column',
};

const descMock = mock((column: unknown) => ({ type: 'desc', column }));

mock.module('@/src/db', () => ({
  db,
  knowledgeItems,
}));

mock.module('drizzle-orm', () => ({
  desc: descMock,
}));

const { getAllKnowledgeItems } = await import('./getAllKnowledgeItems');

describe('getAllKnowledgeItems', () => {
  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    db.select.mockReset();
    descMock.mockClear();
  });

  test('returns items in success result', async () => {
    const items = [{ id: '1' }, { id: '2' }];
    const query = {
      from: mock(),
      orderBy: mock(),
    };

    query.from.mockReturnValue(query);
    query.orderBy.mockResolvedValue(items);
    db.select.mockReturnValue(query);

    const result = await getAllKnowledgeItems();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(items);
    }
    expect(descMock).toHaveBeenCalledTimes(1);
    expect(query.orderBy).toHaveBeenCalledTimes(1);
  });

  test('returns DATABASE_ERROR when query throws', async () => {
    const query = {
      from: mock(),
      orderBy: mock(),
    };

    query.from.mockReturnValue(query);
    query.orderBy.mockRejectedValue(new Error('db down'));
    db.select.mockReturnValue(query);

    const result = await getAllKnowledgeItems();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DATABASE_ERROR');
      expect(result.error.message).toBe('Failed to retrieve knowledge items');
    }
  });
});
