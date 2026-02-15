import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createGetDueItems, type GetDueItemsDeps } from './getDueItems';

type QueryChain = {
  where: ReturnType<typeof mock>;
  orderBy: ReturnType<typeof mock>;
  limit: ReturnType<typeof mock>;
  then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => void;
};

function createAwaitableQuery(rows: unknown[], shouldReject = false): QueryChain {
  const chain: QueryChain = {
    where: mock(() => chain),
    orderBy: mock(() => chain),
    limit: mock(() => chain),
    then: (resolve, reject) => {
      if (shouldReject) {
        Promise.reject(new Error('query failed')).then(resolve, reject);
        return;
      }
      Promise.resolve(rows).then(resolve, reject);
    },
  };
  return chain;
}

const db = {
  select: mock(),
};

const knowledgeItems = {
  nextReviewAt: 'next_review_at_col',
};

const lteMock = mock((column: unknown, value: unknown) => ({ type: 'lte', column, value }));
const ascMock = mock((column: unknown) => ({ type: 'asc', column }));
const isNotNullMock = mock((column: unknown) => ({ type: 'isNotNull', column }));
const logger = { error: mock() };

const deps = {
  db,
  knowledgeItems,
  lte: lteMock,
  asc: ascMock,
  isNotNull: isNotNullMock,
  logger,
} as unknown as GetDueItemsDeps;

const getDueItems = createGetDueItems(deps);

describe('getDueItems', () => {
  beforeEach(() => {
    db.select.mockReset();
    lteMock.mockClear();
    ascMock.mockClear();
    isNotNullMock.mockClear();
    logger.error.mockClear();
  });

  test('returns due items and count', async () => {
    const rows = [{ id: 'a' }, { id: 'b' }];
    const query = createAwaitableQuery(rows);
    db.select.mockReturnValue({
      from: mock(() => query),
    });

    const result = await getDueItems({ now: 123 });

    expect(result).toEqual({
      success: true,
      items: rows,
      count: 2,
    });
    expect(lteMock).toHaveBeenCalledWith('next_review_at_col', 123);
    expect(query.limit).not.toHaveBeenCalled();
  });

  test('applies limit when provided and positive', async () => {
    const rows = [{ id: 'a' }];
    const query = createAwaitableQuery(rows);
    db.select.mockReturnValue({
      from: mock(() => query),
    });

    const result = await getDueItems({ limit: 1, now: 999 });

    expect(result.count).toBe(1);
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  test('returns empty result when query fails', async () => {
    const query = createAwaitableQuery([], true);
    db.select.mockReturnValue({
      from: mock(() => query),
    });

    const result = await getDueItems();

    expect(result).toEqual({
      success: true,
      items: [],
      count: 0,
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
