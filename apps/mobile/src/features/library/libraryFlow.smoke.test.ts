import { describe, expect, mock, test } from 'bun:test';
import {
  createSaveKnowledgeItem,
  type SaveKnowledgeItemDeps,
} from '@/src/features/core/application/capture';
import {
  createGetAllKnowledgeItems,
  type GetAllKnowledgeItemsDeps,
} from './getAllKnowledgeItems';
import { filterKnowledgeItems } from '@/src/features/search/filterKnowledgeItems';
import { parseQueryToKeyword } from '@/src/features/search/parseQueryToKeyword';
import type { KnowledgeItem } from '@glimpse/shared';
import type { MetadataInput, MetadataOutput } from '@/src/features/ai/metadata';

describe('library flow smoke', () => {
  test('capture save -> library query -> query-style search', async () => {
    const originalNow = Date.now;
    let now = 1_700_000_000_000;
    Date.now = () => {
      now += 1;
      return now;
    };

    try {
      const storedItems: KnowledgeItem[] = [];
      let idCounter = 0;

      const saveDeps = {
        coreClient: {
          saveKnowledgeItem: mock(async (item: KnowledgeItem) => {
            storedItems.push(item);
            return item;
          }),
        },
        generateMetadata: mock(async (input: MetadataInput): Promise<MetadataOutput> => ({
          summary: `[summary] ${input.content}`,
          tags: [input.content?.includes('React') ? 'react' : 'general'],
        })),
        initializeReviewSchedule: mock(() => Promise.resolve({
          nextReviewAt: Date.now() + 1000,
          stability: null,
          difficulty: null,
          lastReviewedAt: null,
        })),
        logger: { error: mock() },
        generateId: () => `id-${++idCounter}`,
        isIdCollisionError: () => false,
        maxIdCollisionRetries: 2,
      } as unknown as SaveKnowledgeItemDeps;

      const queryDeps = {
        coreClient: {
          listKnowledgeItems: mock(async () =>
            [...storedItems].sort((a, b) => b.createdAt - a.createdAt)
          ),
        },
      } satisfies GetAllKnowledgeItemsDeps;

      const saveKnowledgeItem = createSaveKnowledgeItem(saveDeps);
      const getAllKnowledgeItems = createGetAllKnowledgeItems(queryDeps);

      const firstSave = await saveKnowledgeItem({
        type: 'note',
        title: 'React memo',
        body: 'React hooks summary',
      });
      expect(firstSave.success).toBe(true);

      const secondSave = await saveKnowledgeItem({
        type: 'link',
        title: 'SQLite article',
        body: 'Index tuning',
        url: 'https://example.com/sqlite',
      });
      expect(secondSave.success).toBe(true);

      const listResult = await getAllKnowledgeItems();
      expect(listResult.success).toBe(true);
      if (!listResult.success) {
        return;
      }

      expect(listResult.items.length).toBe(2);
      expect(listResult.items[0]?.title).toBe('SQLite article');
      expect(listResult.items[1]?.title).toBe('React memo');

      const keyword = parseQueryToKeyword('React 관련 있어?');
      expect(keyword).toBe('React');

      const filtered = filterKnowledgeItems(listResult.items, keyword);
      expect(filtered.length).toBe(1);
      expect(filtered[0]?.title).toBe('React memo');
    } finally {
      Date.now = originalNow;
    }
  });
});
