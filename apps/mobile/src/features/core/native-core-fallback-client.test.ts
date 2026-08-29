import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { createFallbackCoreClient } from './native-core-fallback-client';

const item: KnowledgeItem = {
  id: 'portable-item',
  type: 'note',
  title: 'Portable',
  body: 'Body',
  url: null,
  summary: null,
  tags: ['backup'],
  labels: null,
  provisionalLabels: null,
  labelStatus: null,
  labelSource: null,
  labelVersion: null,
  labelScore: null,
  labelRequestedAt: null,
  labelCompletedAt: null,
  labelError: null,
  createdAt: 1,
  updatedAt: 1,
  stability: null,
  difficulty: null,
  lastReviewedAt: null,
  nextReviewAt: null,
};

describe('fallback core data portability', () => {
  test('exports, deletes, and imports the versioned JSON format', async () => {
    const client = createFallbackCoreClient();
    await client.saveKnowledgeItem(item);

    const dataJson = await client.exportData();
    expect(JSON.parse(dataJson).formatVersion).toBe(2);

    await client.deleteAllData();
    expect(await client.listKnowledgeItems()).toEqual([]);

    const summary = await client.importData(dataJson);
    expect(summary.knowledgeItems).toBe(1);
    expect(await client.getKnowledgeItemById(item.id)).toEqual(item);
  });

  test('rejects an unsupported export version before clearing data', async () => {
    const client = createFallbackCoreClient();
    await client.saveKnowledgeItem(item);

    await expect(
      client.importData(JSON.stringify({ formatVersion: 99 })),
    ).rejects.toThrow('지원하지 않는 데이터 버전');
    expect(await client.getKnowledgeItemById(item.id)).toEqual(item);
  });

  test('exportDelta carries only rows newer than the cursor', async () => {
    const client = createFallbackCoreClient();
    // CoreClient 계약상 선택형이지만 폴백 구현은 반드시 제공한다.
    const exportDelta = client.exportDelta!;
    await client.saveKnowledgeItem({ ...item, id: 'old', updatedAt: 100 });
    await client.saveKnowledgeItem({ ...item, id: 'new', updatedAt: 900 });

    const delta = JSON.parse(await exportDelta(500));
    expect(delta.formatVersion).toBe(2);
    expect(delta.knowledgeItems.map((row: KnowledgeItem) => row.id)).toEqual(['new']);
    expect(delta.tombstones).toEqual([]);
  });

  test('syncDataRevision counts writes monotonically', async () => {
    const client = createFallbackCoreClient();
    const syncDataRevision = client.syncDataRevision!;
    const baseline = (await syncDataRevision()) ?? 0;

    await client.saveKnowledgeItem(item);
    const afterWrite = (await syncDataRevision()) ?? 0;
    expect(afterWrite).toBeGreaterThan(baseline);

    await client.saveKnowledgeItem({ ...item, title: 'Edited' });
    expect((await syncDataRevision()) ?? 0).toBeGreaterThan(afterWrite);
  });
});
