import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createGetDueItems, type GetDueItemsDeps } from './getDueItems';

const coreClient = {
  getDueKnowledgeItems: mock(),
};

const logger = { error: mock() };

const deps = {
  coreClient,
  logger,
} satisfies GetDueItemsDeps;

const getDueItems = createGetDueItems(deps);

describe('getDueItems', () => {
  beforeEach(() => {
    coreClient.getDueKnowledgeItems.mockReset();
    logger.error.mockClear();
  });

  test('returns due items and count', async () => {
    const rows = [{ id: 'a' }, { id: 'b' }] as any;
    coreClient.getDueKnowledgeItems.mockResolvedValue(rows);

    const result = await getDueItems({ now: 123 });

    expect(result).toEqual({
      success: true,
      items: rows,
      count: 2,
    });
    expect(coreClient.getDueKnowledgeItems).toHaveBeenCalledWith({
      now: 123,
      limit: undefined,
    });
  });

  test('applies limit when provided and positive', async () => {
    const rows = [{ id: 'a' }] as any;
    coreClient.getDueKnowledgeItems.mockResolvedValue(rows);

    const result = await getDueItems({ limit: 1, now: 999 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.count).toBe(1);
    }
    expect(coreClient.getDueKnowledgeItems).toHaveBeenCalledWith({
      now: 999,
      limit: 1,
    });
  });

  test('returns failure result when query fails', async () => {
    coreClient.getDueKnowledgeItems.mockRejectedValue(new Error('query failed'));

    const result = await getDueItems();

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
