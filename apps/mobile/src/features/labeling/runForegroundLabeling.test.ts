import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { createRunForegroundLabeling } from './runForegroundLabeling';

function createItem(overrides?: Partial<KnowledgeItem>): KnowledgeItem {
  return {
    id: 'item-1',
    type: 'note',
    title: 'Project follow up',
    body: 'TODO: send latest sprint plan',
    url: null,
    summary: null,
    tags: null,
    createdAt: 1,
    updatedAt: 1,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    reviewCount: 0,
    embedding: null,
    labelStatus: 'pending',
    labelRequestedAt: 10,
    ...overrides,
  };
}

describe('createRunForegroundLabeling', () => {
  const coreClient = {
    listPendingKnowledgeItemsForLabeling: mock<(limit: number) => Promise<KnowledgeItem[]>>(),
    updateKnowledgeItem: mock<(id: string, patch: any) => Promise<KnowledgeItem>>(),
  };

  const resolveEffectiveTarget = mock(() => ({ id: 'test-target' }));
  const executeLabelingTarget = mock(async () => ({
    success: true,
    data: {
      labels: ['todo', 'project'],
      source: 'rules',
      version: 'rules-v1',
      score: 0.65,
    },
  }));

  const runForegroundLabeling = createRunForegroundLabeling({
    coreClient,
    now: () => 100,
    resolveEffectiveTarget,
    executeLabelingTarget,
  });

  beforeEach(() => {
    coreClient.listPendingKnowledgeItemsForLabeling.mockReset();
    coreClient.updateKnowledgeItem.mockReset();
    resolveEffectiveTarget.mockClear();
    executeLabelingTarget.mockClear();
  });

  test('processes pending items and stores provisional labels', async () => {
    const pendingItem = createItem();
    const updatedItem = createItem({
      provisionalLabels: ['todo', 'project'],
      labelStatus: 'provisional',
      labelSource: 'rules',
      labelVersion: 'rules-v1',
      labelScore: 0.65,
      labelCompletedAt: 100,
      updatedAt: 100,
    });

    coreClient.listPendingKnowledgeItemsForLabeling.mockResolvedValue([pendingItem]);
    coreClient.updateKnowledgeItem.mockResolvedValue(updatedItem);

    const result = await runForegroundLabeling(1);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.processedCount).toBe(1);
    expect(coreClient.updateKnowledgeItem).toHaveBeenCalledTimes(1);
    expect(coreClient.updateKnowledgeItem).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        labelStatus: 'provisional',
        labelSource: 'rules',
        provisionalLabels: expect.arrayContaining(['todo']),
      })
    );
  });

  test('returns early when there are no pending items', async () => {
    coreClient.listPendingKnowledgeItemsForLabeling.mockResolvedValue([]);

    const result = await runForegroundLabeling(1);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.processedCount).toBe(0);
    expect(coreClient.updateKnowledgeItem).not.toHaveBeenCalled();
  });
});
