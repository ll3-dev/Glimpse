import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { processPendingBatch } from './process-pending-batch';

/**
 * These tests exercise the pure orchestration (process-pending-batch):
 * saved entries must be dropped from the pending store immediately, a full
 * clear happens only when everything succeeded, and partially-failed batches
 * retain their remaining entries across foreground reruns. No react-native
 * module state is touched.
 */

type FakeStore = {
  text: string[] | null;
  webUrl: { url: string; meta: string }[];
};

let store: FakeStore = { text: null, webUrl: [] };
let fullClearCalls = 0;
let textClearCalls = 0;
let removedUrls: string[][] = [];
const savedValues: string[] = [];
let failingUrls: Set<string> = new Set();

function makeDeps() {
  return {
    saveKnowledgeItem: async (item: KnowledgeItem) => {
      if (item.url && failingUrls.has(item.url)) {
        throw new Error('transient failure');
      }
      savedValues.push(item.url ?? item.body ?? '');
      return item;
    },
    getPendingShareData: async () => {
      if (store.text === null && store.webUrl.length === 0) return null;
      return {
        ...(store.text !== null ? { text: store.text } : {}),
        ...(store.webUrl.length > 0 ? { webUrl: store.webUrl } : {}),
      };
    },
    clearPendingShareData: async () => {
      fullClearCalls += 1;
      store = { text: null, webUrl: [] };
    },
    clearPendingShareText: async () => {
      textClearCalls += 1;
      store.text = null;
    },
    removePendingShareUrls: async (urls: string[]) => {
      removedUrls.push(urls);
      const saved = new Set(urls);
      store.webUrl = store.webUrl.filter((entry) => !saved.has(entry.url));
    },
    logger: {
      info: () => {},
      error: () => {},
    },
  };
}

function resetStore(next: FakeStore) {
  store = next;
  fullClearCalls = 0;
  textClearCalls = 0;
  removedUrls = [];
  savedValues.length = 0;
}

describe('processPendingBatch partial processing', () => {
  test('text success with URL failure clears text, keeps failed URL, skips full clear', async () => {
    failingUrls = new Set(['https://rejected.example']);
    resetStore({ text: ['remember this'], webUrl: [{ url: 'https://rejected.example', meta: '' }] });

    const savedCount = await processPendingBatch(makeDeps());

    expect(savedCount).toBe(0); // batch incomplete -> reported as not fully done
    expect(savedValues).toEqual(['remember this']);
    expect(textClearCalls).toBe(1); // saved text dropped immediately
    expect(removedUrls).toEqual([]); // failed URL was never marked saved
    expect(fullClearCalls).toBe(0);
    expect(store.text).toBeNull();
    expect(store.webUrl).toHaveLength(1); // retained for the next foreground run
  });

  test('rerun after partial failure does not re-save the already-saved text', async () => {
    failingUrls = new Set(['https://rejected.example']);
    resetStore({ text: ['remember this'], webUrl: [{ url: 'https://rejected.example', meta: '' }] });

    await processPendingBatch(makeDeps());
    expect(savedValues).toEqual(['remember this']);

    // Second foreground run sees the shrunk store (text cleared, URL kept).
    await processPendingBatch(makeDeps());

    expect(
      savedValues.filter((value) => value === 'remember this'),
    ).toHaveLength(1); // text was NOT re-saved
    expect(savedValues).toHaveLength(1); // only the retried (still failing) URL attempt
  });

  test('all-success batch performs the full clear', async () => {
    failingUrls = new Set();
    resetStore({ text: ['note'], webUrl: [{ url: 'https://kept.example', meta: '' }] });

    const savedCount = await processPendingBatch(makeDeps());

    expect(savedCount).toBe(1);
    expect(fullClearCalls).toBe(1);
    expect(store.text).toBeNull();
    expect(store.webUrl).toHaveLength(0);
  });
});
