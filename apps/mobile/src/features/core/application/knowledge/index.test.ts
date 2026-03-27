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

  test('filters weekly items in application layer', async () => {
    await expect(listWeeklyKnowledgeItemsWithCore(coreClient, 20)).resolves.toEqual([items[1]]);
  });

  test('filters pending labeling items in application layer', async () => {
    await expect(listPendingKnowledgeItemsForLabelingWithCore(coreClient, 1)).resolves.toEqual([items[0]]);
  });

  test('filters due items in application layer', async () => {
    await expect(getDueKnowledgeItemsWithCore(coreClient, { now: 25 })).resolves.toEqual([items[0]]);
  });
});
