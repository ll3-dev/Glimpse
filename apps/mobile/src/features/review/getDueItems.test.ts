import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createGetDueItems,
  type GetDueItemsDeps,
} from '@/src/features/core/application/review';

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

  test('returns due items', async () => {
    const rows = [{ id: 'a' }, { id: 'b' }] as any;
    coreClient.getDueKnowledgeItems.mockResolvedValue(rows);

    const result = await getDueItems();

    expect(result).toEqual({
      success: true,
      items: rows,
    });
    expect(coreClient.getDueKnowledgeItems).toHaveBeenCalledWith({
      now: expect.any(Number),
      limit: undefined,
    });
  });

  test('applies limit when provided', async () => {
    const rows = [{ id: 'a' }] as any;
    coreClient.getDueKnowledgeItems.mockResolvedValue(rows);

    const result = await getDueItems({ limit: 1 });

    expect(result.success).toBe(true);
    expect(coreClient.getDueKnowledgeItems).toHaveBeenCalledWith({
      now: expect.any(Number),
      limit: 1,
    });
  });

  test('returns failure result when query fails', async () => {
    coreClient.getDueKnowledgeItems.mockRejectedValue(new Error('query failed'));

    const result = await getDueItems();

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('REVIEW_ERROR');
    }
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
