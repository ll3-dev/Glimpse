import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import {
  getDueKnowledgeItemsWithCore,
  listKnowledgeItemsByIdsWithCore,
  listPendingKnowledgeItemsForLabelingWithCore,
  listWeeklyKnowledgeItemsWithCore,
} from './index';

const items: KnowledgeItem[] = [
  {
    id: 'one',
    type: 'note',
    title: 'One',
    body: null,
    url: null,
    summary: null,
    tags: null,
    labels: null,
    provisionalLabels: null,
    labelStatus: 'pending',
    labelSource: null,
    labelVersion: null,
    labelScore: null,
    labelRequestedAt: null,
    labelCompletedAt: null,
    labelError: null,
    createdAt: 10,
    updatedAt: 10,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: 20,
  },
  {
    id: 'two',
    type: 'note',
    title: 'Two',
    body: null,
    url: null,
    summary: null,
    tags: null,
    labels: null,
    provisionalLabels: null,
    labelStatus: 'final',
    labelSource: null,
    labelVersion: null,
    labelScore: null,
    labelRequestedAt: null,
    labelCompletedAt: null,
    labelError: null,
    createdAt: 30,
    updatedAt: 30,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: 40,
  },
];

const coreClient = {
  listKnowledgeItems: async () => items,
};

describe('knowledge application queries', () => {
  test('filters items by id in application layer', async () => {
    await expect(listKnowledgeItemsByIdsWithCore(coreClient, ['two'])).resolves.toEqual([items[1]]);
  });

  test('returns empty list when no ids are requested', async () => {
    await expect(listKnowledgeItemsByIdsWithCore(coreClient, [])).resolves.toEqual([]);
  });

  test('filters weekly items in application layer', async () => {
    await expect(listWeeklyKnowledgeItemsWithCore(coreClient, 20)).resolves.toEqual([items[1]]);
  });

  test('filters pending labeling items in application layer', async () => {
    await expect(listPendingKnowledgeItemsForLabelingWithCore(coreClient, 1)).resolves.toEqual([items[0]]);
  });

  test('filters due items in application layer', async () => {
    await expect(getDueKnowledgeItemsWithCore(coreClient, { now: 25 })).resolves.toEqual([items[0]]);
  });

  test('treats missing review timestamps as due and includes exact boundary matches', async () => {
    const boundaryItems: KnowledgeItem[] = [
      {
        ...items[0],
        id: 'missing-review',
        nextReviewAt: null,
      },
      {
        ...items[1],
        id: 'exact-boundary',
        nextReviewAt: 25,
      },
      {
        ...items[1],
        id: 'future-review',
        nextReviewAt: 26,
      },
    ];

    const boundaryCoreClient = {
      listKnowledgeItems: async () => boundaryItems,
    };

    await expect(getDueKnowledgeItemsWithCore(boundaryCoreClient, { now: 25 })).resolves.toEqual([
      boundaryItems[0],
      boundaryItems[1],
    ]);
  });

  test('respects explicit limit values including zero', async () => {
    await expect(getDueKnowledgeItemsWithCore(coreClient, { now: 50, limit: 1 })).resolves.toEqual([
      items[0],
    ]);
    await expect(getDueKnowledgeItemsWithCore(coreClient, { now: 50, limit: 0 })).resolves.toEqual([]);
  });
});
