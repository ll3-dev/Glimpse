import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createGetAllKnowledgeItems,
  type GetAllKnowledgeItemsDeps,
} from './getAllKnowledgeItems';

const db = {
  select: mock(),
};

const knowledgeItems = {
  createdAt: 'created_at_column',
};

const descMock = mock((column: unknown) => ({ type: 'desc', column }));

const deps = {
  db,
  knowledgeItems,
  desc: descMock,
} as unknown as GetAllKnowledgeItemsDeps;

const getAllKnowledgeItems = createGetAllKnowledgeItems(deps);

describe('getAllKnowledgeItems', () => {
  beforeEach(() => {
    db.select.mockReset();
    descMock.mockClear();
  });

  test('returns items in success result', async () => {
    const items = [{ id: '1' }, { id: '2' }] as any;
    const orderExpression = { type: 'desc', column: knowledgeItems.createdAt };
    const query = {
      from: mock(),
      orderBy: mock(),
    };

    query.from.mockReturnValue(query);
    query.orderBy.mockResolvedValue(items);
    descMock.mockReturnValue(orderExpression);
    db.select.mockReturnValue(query);

    const result = await getAllKnowledgeItems();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(items);
    }
    expect(descMock).toHaveBeenCalledTimes(1);
    expect(descMock).toHaveBeenCalledWith(knowledgeItems.createdAt);
    expect(query.orderBy).toHaveBeenCalledTimes(1);
    expect(query.orderBy).toHaveBeenCalledWith(orderExpression);
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
    if (result.success === false) {
      expect(result.error.code).toBe('DATABASE_ERROR');
      expect(result.error.message).toBe('Failed to retrieve knowledge items');
    }
  });
});
