import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { KnowledgeItem } from '@/src/db';
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
    labelStatus: 'pending',
    labelRequestedAt: 10,
    ...overrides,
  };
}

describe('createRunForegroundLabeling', () => {
  beforeEach(() => {
    mock.clearAllMocks();
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

    const returning = mock(async () => [updatedItem]);
    const where = mock(() => ({ returning }));
    const set = mock(() => ({ where }));
    const update = mock(() => ({ set }));
    const orderBy = mock(async () => [pendingItem]);
    const from = mock(() => ({ orderBy }));
    const select = mock(() => ({ from }));

    const runForegroundLabeling = createRunForegroundLabeling({
      db: { select, update } as never,
      knowledgeItems: { id: 'id', labelRequestedAt: 'label_requested_at' } as never,
      eq: mock(() => ({})) as never,
      asc: mock((value: unknown) => value) as never,
      now: () => 100,
    });

    const result = await runForegroundLabeling(1);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.processedCount).toBe(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        labelStatus: 'provisional',
        labelSource: 'rules',
        provisionalLabels: expect.arrayContaining(['todo']),
      })
    );
  });

  test('returns early when there are no pending items', async () => {
    const orderBy = mock(async () => [createItem({ labelStatus: 'idle' })]);
    const from = mock(() => ({ orderBy }));
    const select = mock(() => ({ from }));
    const update = mock();

    const runForegroundLabeling = createRunForegroundLabeling({
      db: { select, update } as never,
      knowledgeItems: { labelRequestedAt: 'label_requested_at' } as never,
      eq: mock(() => ({})) as never,
      asc: mock((value: unknown) => value) as never,
    });

    const result = await runForegroundLabeling(1);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.processedCount).toBe(0);
    expect(update).not.toHaveBeenCalled();
  });
});
