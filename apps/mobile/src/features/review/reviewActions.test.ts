import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createMarkAsReviewed,
  createPostponeReview,
  type ReviewActionsDeps,
} from '@/src/features/core/application/review';
import type { KnowledgeItem } from '@glimpse/shared';

const mockItem: KnowledgeItem = {
  id: 'k1',
  type: 'note',
  title: 'Test',
  body: 'body',
  createdAt: 1000,
  updatedAt: 1000,
  tags: null,
  url: null,
  lastReviewedAt: null,
  nextReviewAt: null,
  stability: null,
  difficulty: null,
  summary: null,
};

const createMockDeps = () => {
  const getKnowledgeItemById = mock<(id: string) => Promise<KnowledgeItem | null>>();
  const updateKnowledgeItem = mock<
    (id: string, patch: Partial<KnowledgeItem>) => Promise<KnowledgeItem>
  >();
  const calculateNextReviewFromFeedback = mock(() => ({
    intervalMs: 2 * 24 * 60 * 60 * 1000,
    nextReviewAt: 1_700_000_123_000,
    stability: 2.5,
    difficulty: 5.5,
  }));
  const logger = { error: mock() };

  return {
    coreClient: { getKnowledgeItemById, updateKnowledgeItem },
    calculateNextReviewFromFeedback,
    logger,
  } as unknown as ReviewActionsDeps;
};

describe('reviewActions', () => {
  let deps: ReviewActionsDeps;

  beforeEach(() => {
    deps = createMockDeps();
    deps.calculateNextReviewFromFeedback = mock(() => ({
      intervalMs: 2 * 24 * 60 * 60 * 1000,
      nextReviewAt: 1_700_000_123_000,
      stability: 2.5,
      difficulty: 5.5,
    }));
  });

  test('markAsReviewed returns NOT_FOUND when item does not exist', async () => {
    deps.coreClient.getKnowledgeItemById = mock(async () => null);

    const markAsReviewed = createMarkAsReviewed(deps);
    const result = await markAsReviewed('missing-id');

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Item not found',
      },
    });
  });

  test('markAsReviewed updates review schedule and returns updated item', async () => {
    deps.coreClient.getKnowledgeItemById = mock(async () => ({ ...mockItem }));
    deps.coreClient.updateKnowledgeItem = mock(async (_id: string, patch: Partial<KnowledgeItem>) => ({
      ...mockItem,
      ...patch,
    })) as any;

    const markAsReviewed = createMarkAsReviewed(deps);
    const result = await markAsReviewed('k1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.item.id).toBe('k1');
    }
    expect(deps.calculateNextReviewFromFeedback).toHaveBeenCalledWith(
      null,
      null,
      'remembered',
      expect.any(Number),
      { stabilityDays: 0.5, difficulty: 5.0 },
    );
  });

  test('postponeReview uses default interval when not provided', async () => {
    deps.coreClient.getKnowledgeItemById = mock(async () => ({ ...mockItem, id: 'k2' }));
    deps.coreClient.updateKnowledgeItem = mock(async (_id: string, patch: Partial<KnowledgeItem>) => ({
      ...mockItem,
      id: 'k2',
      ...patch,
    })) as any;

    const postponeReview = createPostponeReview(deps);
    const result = await postponeReview('k2');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.item.nextReviewAt).toBe(1_700_000_123_000);
    }
  });

  test('returns DATABASE_ERROR when update operation throws', async () => {
    deps.coreClient.getKnowledgeItemById = mock(async () => ({ ...mockItem, id: 'k3' }));
    deps.coreClient.updateKnowledgeItem = mock(async () => {
      throw new Error('update failed');
    });

    const markAsReviewed = createMarkAsReviewed(deps);
    const result = await markAsReviewed('k3');

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('REVIEW_ERROR');
    }
  });
});
