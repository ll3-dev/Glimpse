import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import {
  calculateInitialReviewAt,
  createBatchInitializeReviewSchedules,
  createGetDueItems,
  createMarkAsReviewed,
  createPostponeReview,
  initializeReviewScheduleWithCore,
  loadKnowledgeItemOrFail,
} from './index';

function createItem(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: 'item-1',
    type: 'note',
    title: 'Item',
    body: null,
    url: null,
    summary: null,
    tags: null,
    labels: null,
    provisionalLabels: null,
    labelStatus: null,
    labelSource: null,
    labelVersion: null,
    labelScore: null,
    labelRequestedAt: null,
    labelCompletedAt: null,
    labelError: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    ...overrides,
  };
}

describe('core review application layer', () => {
  const logger = {
    error: mock(),
  };

  beforeEach(() => {
    logger.error.mockReset();
  });

  test('calculateInitialReviewAt adds the provided interval', () => {
    expect(calculateInitialReviewAt(1_000, 500)).toBe(1_500);
  });

  test('initializeReviewScheduleWithCore delegates typed input to core', async () => {
    const initializeReviewSchedule = mock(() => ({
      nextReviewAt: 1_500,
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
    }));

    const result = await initializeReviewScheduleWithCore(
      { initializeReviewSchedule },
      1_000,
      500
    );

    expect(initializeReviewSchedule).toHaveBeenCalledWith({
      createdAt: 1_000,
      intervalMs: 500,
    });
    expect(result.nextReviewAt).toBe(1_500);
  });

  test('loadKnowledgeItemOrFail returns null and logs when item is missing', async () => {
    const coreClient = {
      getKnowledgeItemById: mock(async () => null),
      updateKnowledgeItem: mock(async () => createItem()),
    };

    await expect(loadKnowledgeItemOrFail(coreClient, 'missing', logger)).resolves.toBeNull();
    expect(logger.error).toHaveBeenCalledWith('Knowledge item not found', { itemId: 'missing' });
  });

  test('markAsReviewed persists review timestamps from feedback calculation', async () => {
    const item = createItem({ id: 'review-me', nextReviewAt: 2_000 });
    const updateKnowledgeItem = mock(async (_itemId: string, patch: Partial<KnowledgeItem>) =>
      createItem({
        ...item,
        ...patch,
        id: 'review-me',
      })
    );
    const calculateNextReviewFromFeedback = mock(() => ({
      intervalMs: 500,
      nextReviewAt: 3_000,
    }));

    const result = await createMarkAsReviewed({
      coreClient: {
        getKnowledgeItemById: mock(async () => item),
        updateKnowledgeItem,
      },
      calculateNextReviewFromFeedback,
      logger,
    })('review-me', 2_500);

    expect(calculateNextReviewFromFeedback).toHaveBeenCalledWith(
      null,
      2_000,
      'remembered',
      2_500
    );
    expect(updateKnowledgeItem).toHaveBeenCalledWith('review-me', {
      lastReviewedAt: 2_500,
      nextReviewAt: 3_000,
      updatedAt: 2_500,
    });
    expect(result).toMatchObject({ success: true });
  });

  test('postponeReview returns NOT_FOUND when item lookup misses', async () => {
    const result = await createPostponeReview({
      coreClient: {
        getKnowledgeItemById: mock(async () => null),
        updateKnowledgeItem: mock(async () => createItem()),
      },
      calculateNextReviewFromFeedback: mock(() => ({
        intervalMs: 1,
        nextReviewAt: 1,
      })),
      logger,
    })('missing', 123);

    expect(result).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Item not found' },
      itemId: 'missing',
    });
  });

  test('getDueItems forwards limit and converts thrown errors', async () => {
    const getDueKnowledgeItems = mock(async () => {
      throw new Error('query failed');
    });

    const result = await createGetDueItems({
      coreClient: { getDueKnowledgeItems },
      logger,
    })({ limit: 0 });

    expect(getDueKnowledgeItems).toHaveBeenCalledWith({
      now: expect.any(Number),
      limit: 0,
    });
    expect(result).toEqual({
      success: false,
      error: { code: 'REVIEW_ERROR', message: 'query failed' },
    });
    expect(logger.error).toHaveBeenCalledWith('Failed to get due items', {
      error: expect.any(Error),
    });
  });

  test('batch initialization updates only unscheduled items and returns count', async () => {
    const updateKnowledgeItem = mock(async (itemId: string, patch: Partial<KnowledgeItem>) =>
      createItem({ id: itemId, ...patch })
    );

    const result = await createBatchInitializeReviewSchedules({
      coreClient: {
        listKnowledgeItems: mock(async () => [
          createItem({ id: 'needs-schedule', createdAt: 100, nextReviewAt: null }),
          createItem({ id: 'already-scheduled', createdAt: 200, nextReviewAt: 999 }),
        ]),
        updateKnowledgeItem,
      },
      logger,
    })(600);

    expect(result).toEqual({ count: 1 });
    expect(updateKnowledgeItem).toHaveBeenCalledTimes(1);
    expect(updateKnowledgeItem).toHaveBeenCalledWith('needs-schedule', {
      nextReviewAt: 700,
      updatedAt: expect.any(Number),
    });
  });
});
