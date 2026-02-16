import { describe, expect, test } from 'bun:test';
import {
  createSaveKnowledgeItem,
  type SaveKnowledgeItemDeps,
} from '@/src/features/capture/saveKnowledgeItem';
import {
  createGetAllKnowledgeItems,
  type GetAllKnowledgeItemsDeps,
} from './getAllKnowledgeItems';
import { filterKnowledgeItems } from '@/src/features/search/filterKnowledgeItems';
import { parseQueryToKeyword } from '@/src/features/search/parseQueryToKeyword';
import type { KnowledgeItem } from '@/src/db';

type InsertableItem = Omit<KnowledgeItem, 'id'> & { id: string };

describe('library flow smoke', () => {
  test('collect save -> library query -> query-style search', async () => {
    const originalNow = Date.now;
    let now = 1_700_000_000_000;
    Date.now = () => {
      now += 1;
      return now;
    };

    try {
      const storedItems: InsertableItem[] = [];

      const db = {
        insert: () => ({
          values: async (value: InsertableItem) => {
            storedItems.push(value);
          },
        }),
        select: () => ({
          from: () => ({
            orderBy: async () =>
              [...storedItems].sort((a, b) => (b.createdAt as number) - (a.createdAt as number)),
          }),
        }),
      };

      const knowledgeItems = { createdAt: 'created_at_column' };

      const saveDeps = {
        db,
        knowledgeItems,
        generateSummaryStub: (content: string) => `[summary] ${content}`,
        generateTagsStub: (content: string) => [content.includes('React') ? 'react' : 'general'],
        initializeReviewSchedule: (createdAt: number) => ({
          nextReviewAt: createdAt + 1000,
          stability: null,
          difficulty: null,
          lastReviewedAt: null,
        }),
        logger: { error: () => undefined },
      } as unknown as SaveKnowledgeItemDeps;

      const queryDeps = {
        db,
        knowledgeItems,
        desc: (column: unknown) => column,
      } as unknown as GetAllKnowledgeItemsDeps;

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

      expect(listResult.data.length).toBe(2);
      expect(listResult.data[0]?.title).toBe('SQLite article');
      expect(listResult.data[1]?.title).toBe('React memo');

      const keyword = parseQueryToKeyword('React 관련 있어?');
      expect(keyword).toBe('React');

      const filtered = filterKnowledgeItems(listResult.data, keyword);
      expect(filtered.length).toBe(1);
      expect(filtered[0]?.title).toBe('React memo');
    } finally {
      Date.now = originalNow;
    }
  });
});
