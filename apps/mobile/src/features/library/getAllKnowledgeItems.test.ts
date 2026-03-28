import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createGetAllKnowledgeItems,
  type GetAllKnowledgeItemsDeps,
} from '@/src/features/library/getAllKnowledgeItems';

const coreClient = {
  listKnowledgeItems: mock(),
};

const deps = {
  coreClient,
} satisfies GetAllKnowledgeItemsDeps;

const getAllKnowledgeItems = createGetAllKnowledgeItems(deps);

describe('getAllKnowledgeItems', () => {
  beforeEach(() => {
    coreClient.listKnowledgeItems.mockReset();
  });

  test('returns items in success result', async () => {
    const items = [{ id: '1' }, { id: '2' }] as any;
    coreClient.listKnowledgeItems.mockResolvedValue(items);

    const result = await getAllKnowledgeItems();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toEqual(items);
    }
    expect(coreClient.listKnowledgeItems).toHaveBeenCalledTimes(1);
  });

  test('returns failure result when query throws', async () => {
    coreClient.listKnowledgeItems.mockRejectedValue(new Error('db down'));

    const result = await getAllKnowledgeItems();

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('db down');
    }
  });
});
