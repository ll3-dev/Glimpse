import { describe, expect, it } from 'bun:test';
import { selectItemsForBackfill, runLabelingBackfill, LABELING_BACKFILL_VERSION } from './backfill';
import type { KnowledgeItem } from '@glimpse/shared';

function item(overrides: Partial<KnowledgeItem>): KnowledgeItem {
  return {
    id: 'x', type: 'note', title: null, body: 'hello', url: null, summary: null,
    tags: null, labels: null, provisionalLabels: null, labelStatus: null,
    labelSource: null, labelVersion: null, labelScore: null, labelRequestedAt: null,
    labelCompletedAt: null, labelError: null, createdAt: 0, updatedAt: 0,
    stability: null, difficulty: null, lastReviewedAt: null, nextReviewAt: null,
    ...overrides,
  };
}

describe('selectItemsForBackfill', () => {
  it('labelStatus가 null이고 본문이 있는 항목만 선별', () => {
    const items = [
      item({ id: 'a' }),
      item({ id: 'b', labelStatus: 'pending' }),
      item({ id: 'c', labelStatus: 'provisional' }),
      item({ id: 'd', body: null }),
      item({ id: 'e', body: '   ' }),
    ];
    expect(selectItemsForBackfill(items).map((i) => i.id)).toEqual(['a']);
  });
  it('본문이 없어도 title이 있으면 선별', () => {
    expect(selectItemsForBackfill([item({ id: 't', body: null, title: 'T' })]).map((i) => i.id)).toEqual(['t']);
  });
});

describe('runLabelingBackfill', () => {
  it('미라벨 항목을 pending 큐에 편입하고 플래그를 남긴다', async () => {
    const updates: Array<{ id: string; patch: Partial<KnowledgeItem> }> = [];
    const coreClient = {
      listKnowledgeItems: async () => [
        item({ id: 'a', updatedAt: 100 }),
        item({ id: 'b', labelStatus: 'pending' as const }),
      ],
      updateKnowledgeItem: async (id: string, patch: Partial<KnowledgeItem>) => {
        updates.push({ id, patch });
        return item({ id });
      },
    };
    let version = 0;
    const result = await runLabelingBackfill({
      coreClient,
      getCompletedBackfillVersion: () => version,
      setCompletedBackfillVersion: (v) => {
        version = v;
      },
      now: () => 1234,
    });
    expect(result.markedCount).toBe(1);
    expect(updates[0].id).toBe('a');
    expect(updates[0].patch.labelStatus).toBe('pending');
    expect(updates[0].patch.labelRequestedAt).toBe(1234);
    expect(updates[0].patch.updatedAt).toBe(1234);
    expect(version).toBe(LABELING_BACKFILL_VERSION);
  });

  it('완료 플래그가 있으면 재실행하지 않는다', async () => {
    let called = false;
    const coreClient = {
      listKnowledgeItems: async () => {
        called = true;
        return [];
      },
      updateKnowledgeItem: async (id: string) => item({ id }),
    };
    const result = await runLabelingBackfill({
      coreClient,
      getCompletedBackfillVersion: () => LABELING_BACKFILL_VERSION,
      setCompletedBackfillVersion: () => undefined,
    });
    expect(result.markedCount).toBe(0);
    expect(called).toBe(false);
  });

  it('개별 실패는 건너뛰고, 하나라도 실패하면 플래그를 남기지 않는다', async () => {
    let calls = 0;
    const coreClient = {
      listKnowledgeItems: async () => [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c' })],
      updateKnowledgeItem: async (id: string) => {
        calls += 1;
        if (id === 'b') throw new Error('boom');
        return item({ id });
      },
    };
    let version = 0;
    const result = await runLabelingBackfill({
      coreClient,
      getCompletedBackfillVersion: () => version,
      setCompletedBackfillVersion: (v) => {
        version = v;
      },
    });
    expect(result.markedCount).toBe(2);
    expect(calls).toBe(3);
    expect(version).toBe(0);
  });
});
