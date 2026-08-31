import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { loadKnowledgeItemOrFail } from '@glimpse/features';
import type { KnowledgeItem } from '@glimpse/shared';

const createMockCoreClient = () => ({
  getKnowledgeItemById: mock<(id: string) => Promise<KnowledgeItem | null>>(),
  updateKnowledgeItem: mock(),
});

const createMockLogger = () => ({ error: mock() });

describe('loadKnowledgeItemOrFail', () => {
  let coreClient: ReturnType<typeof createMockCoreClient>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    coreClient = createMockCoreClient();
    logger = createMockLogger();
  });

  test('returns item when found', async () => {
    const mockItem: KnowledgeItem = {
      id: 'item-1',
      type: 'note',
      title: 'Test Note',
      body: 'Test body',
      createdAt: 1000,
      updatedAt: 1000,
      tags: null,
      url: null,
      lastReviewedAt: null,
      nextReviewAt: null,
      stability: null,
      difficulty: null,
      summary: null,
    };

    coreClient.getKnowledgeItemById.mockResolvedValue(mockItem);

    const result = await loadKnowledgeItemOrFail(coreClient, 'item-1', logger);

    expect(result).toEqual(mockItem);
  });

  test('returns null when item does not exist', async () => {
    coreClient.getKnowledgeItemById.mockResolvedValue(null);

    const result = await loadKnowledgeItemOrFail(coreClient, 'missing-id', logger);

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith('Knowledge item not found', { itemId: 'missing-id' });
  });

  test('throws and propagates database errors', async () => {
    coreClient.getKnowledgeItemById.mockRejectedValue(new Error('DB connection failed'));

    await expect(loadKnowledgeItemOrFail(coreClient, 'item-1', logger)).rejects.toThrow(
      'DB connection failed'
    );
  });

  test('calls getKnowledgeItemById with correct id', async () => {
    coreClient.getKnowledgeItemById.mockResolvedValue(null);

    await loadKnowledgeItemOrFail(coreClient, 'test-id');

    expect(coreClient.getKnowledgeItemById).toHaveBeenCalledWith('test-id');
  });
});
