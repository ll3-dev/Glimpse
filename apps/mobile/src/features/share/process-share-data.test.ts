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

    const result = await createProcessShareData({
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

    expect(result.savedCount).toBe(2);
    expect(result.failedUrls).toEqual([]);    expect(savedItems).toHaveLength(2);
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

  test('returns zero saves when there is nothing to process', async () => {
    const saveKnowledgeItem = mock(async (item: KnowledgeItem) => item);

    const result = await createProcessShareData({
      saveKnowledgeItem,
      generateId: () => 'share-id-1',
      logger: { info: mock() },
      now: () => 1_700_000_000_000,
    })({});

    expect(result.savedCount).toBe(0);
    expect(result.textSaved).toBe(false);
    expect(result.savedUrls).toEqual([]);
    expect(result.failedUrls).toEqual([]);
    expect(saveKnowledgeItem).not.toHaveBeenCalled();
  });

  test('one failing URL does not abort the remaining URL saves', async () => {
    const saveKnowledgeItem = mock(async (item: KnowledgeItem) => {
      if (item.title === 'https://failing.example') {
        throw new Error('db closed');
      }
      return item;
    });

    const result = await createProcessShareData({
      saveKnowledgeItem,
      generateId: () => 'share-id-1',
      logger: { info: mock() },
      now: () => 1_700_000_000_000,
    })({
      webUrl: [
        { url: 'https://first.example', meta: '' },
        { url: 'https://failing.example', meta: '' },
        { url: 'https://third.example', meta: '' },
      ],
    });

    expect(result.savedCount).toBe(2);
    expect(result.savedUrls.sort()).toEqual([
      'https://first.example',
      'https://third.example',
    ]);
    expect(result.failedUrls).toEqual(['https://failing.example']);
  });

  test('text failure is reported without blocking URL saves', async () => {
    const saveKnowledgeItem = mock(async (item: KnowledgeItem) => {
      if (item.body === 'boom') {
        throw new Error('disk full');
      }
      return item;
    });

    const result = await createProcessShareData({
      saveKnowledgeItem,
      generateId: () => 'share-id-1',
      logger: { info: mock() },
      now: () => 1_700_000_000_000,
    })({
      text: ['boom'],
      webUrl: [{ url: 'https://example.com', meta: '' }],
    });

    expect(result.savedCount).toBe(1);
    expect(result.textSaved).toBe(false);
    expect(result.savedUrls).toEqual(['https://example.com']);
    expect(result.failedUrls).toEqual([]);
  });
});

describe('processShareData idempotency', () => {
  test('successful entries are reported per-entry so callers can shrink the pending store', async () => {
    const savedItems: KnowledgeItem[] = [];
    const saveKnowledgeItem = mock(async (item: KnowledgeItem) => {
      if (item.url === 'https://rejected.example') {
        throw new Error('transient failure');
      }
      savedItems.push(item);
      return item;
    });

    const process = createProcessShareData({
      saveKnowledgeItem,
      generateId: () => 'share-id-1',
      logger: { info: mock() },
      now: () => 1_700_000_000_000,
    });

    // One run: text succeeds, first URL succeeds, second URL fails.
    const run = await process({
      text: ['remember this'],
      webUrl: [
        { url: 'https://kept.example', meta: '' },
        { url: 'https://rejected.example', meta: '' },
      ],
    });

    expect(run.savedCount).toBe(2);
    expect(run.textSaved).toBe(true);
    expect(run.savedUrls).toEqual(['https://kept.example']);
    expect(run.failedUrls).toEqual(['https://rejected.example']);
    // Only the failing URL was attempted twice across both phases? No:
    // each entry gets exactly one save attempt.
    expect(saveKnowledgeItem.mock.calls.length).toBe(3);
    expect(savedItems.some((item) => item.body === 'remember this')).toBe(true);
  });
});
