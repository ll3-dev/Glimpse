import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createGetWeeklyItems,
  type GetWeeklyItemsDeps,
} from '@glimpse/features';

const coreClient = {
  listWeeklyKnowledgeItems: mock(),
};

const deps = {
  coreClient,
} satisfies GetWeeklyItemsDeps;

const getWeeklyItems = createGetWeeklyItems(deps);

describe('getWeeklyItems', () => {
  beforeEach(() => {
    coreClient.listWeeklyKnowledgeItems.mockReset();
  });

  test('returns recent items on success', async () => {
    const items = [{ id: 'a' }, { id: 'b' }] as any;
    const now = 10_000;
    Date.now = mock(() => now);
    coreClient.listWeeklyKnowledgeItems.mockResolvedValue(items);

    const result = await getWeeklyItems();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toEqual(items);
    }
    expect(coreClient.listWeeklyKnowledgeItems).toHaveBeenCalledWith(
      now - 7 * 24 * 60 * 60 * 1000
    );
  });

  test('returns error when query fails', async () => {
    coreClient.listWeeklyKnowledgeItems.mockRejectedValue(new Error('query failed'));

    const result = await getWeeklyItems();

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('RECOMMENDATION_ERROR');
    }
  });
});
