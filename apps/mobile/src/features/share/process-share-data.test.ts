import { describe, expect, mock, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { createProcessShareData } from './process-share-data';

describe('processShareData labeling enrollment', () => {
  test('text and URL shares are saved with labelStatus pending and requested timestamp', async () => {
    const savedItems: KnowledgeItem[] = [];
    const saveKnowledgeItem = mock(async (item: KnowledgeItem) => {
      savedItems.push(item);
      return item;
    });

    const saved = await createProcessShareData({
      saveKnowledgeItem,
      generateId: (() => {
        let seq = 0;
        return () => `share-id-${(seq += 1)}`;
      })(),
      logger: { info: mock() },
      now: () => 1_700_000_000_000,
    })({
      text: ['shared text'],
      webUrl: [{ url: 'https://example.com', meta: 'meta description' }],
    });

    expect(saved).toBe(true);
    expect(savedItems).toHaveLength(2);
    for (const item of savedItems) {
      expect(item.labelStatus).toBe('pending');
      expect(item.labelRequestedAt).toBe(1_700_000_000_000);
      expect(item.createdAt).toBe(1_700_000_000_000);
    }
    expect(savedItems[0]).toMatchObject({ type: 'share', body: 'shared text', url: null });
    expect(savedItems[1]).toMatchObject({
      type: 'share',
      title: 'https://example.com',
      url: 'https://example.com',
    });
  });

  test('returns false when there is nothing to save', async () => {
    const saveKnowledgeItem = mock(async (item: KnowledgeItem) => item);

    const saved = await createProcessShareData({
      saveKnowledgeItem,
      generateId: () => 'share-id-1',
      logger: { info: mock() },
      now: () => 1_700_000_000_000,
    })({});

    expect(saved).toBe(false);
    expect(saveKnowledgeItem).not.toHaveBeenCalled();
  });
});
