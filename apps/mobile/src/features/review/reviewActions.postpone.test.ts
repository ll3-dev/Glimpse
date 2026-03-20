import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPostponeReview } from './reviewActions.postpone';
import { DEFAULT_POSTPONE_INTERVAL_MS } from './reviewActions.types';
import type { ReviewActionsDeps } from './reviewActions.types';
import type { KnowledgeItem } from '@glimpse/shared';

const createMockKnowledgeItem = (overrides?: Partial<KnowledgeItem>): KnowledgeItem => ({
  id: 'test-id',
  type: 'note',
  title: 'Test Note',
  body: 'Test body',
  createdAt: 1000,
  updatedAt: 1000,
  tags: null,
  nextReviewAt: null,
  ...overrides,
});

const createMockDeps = () => {
  const select = mock();
  const update = mock();
  const db = { select, update };
  const knowledgeItems = { id: 'id_column' };
  const eq = mock((left: unknown, right: unknown) => ({ left, right }));
  const logger = { info: mock(), error: mock() };
  const calculateNextReviewFromFeedback = mock(() => ({
    intervalMs: 2 * 24 * 60 * 60 * 1000,
    nextReviewAt: 1_700_000_123_000,
  }));

  return {
    db,
    knowledgeItems,
    eq,
    logger,
    calculateNextReviewFromFeedback,
  } as unknown as ReviewActionsDeps;
};

describe('createPostponeReview', () => {
  let deps: ReviewActionsDeps;
  let postponeReview: ReturnType<typeof createPostponeReview>;

  beforeEach(() => {
    deps = createMockDeps();
    postponeReview = createPostponeReview(deps);
  });

  test('returns NOT_FOUND when item does not exist', async () => {
    const from = mock(() => ({
      where: mock(async () => []),
    }));
    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    const result = await postponeReview('missing-id');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  test('uses default interval when not provided', async () => {
    const mockItem = createMockKnowledgeItem({ nextReviewAt: null });
    const from = mock(() => ({
      where: mock(async () => [mockItem]),
    }));
    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    let capturedSetValues: unknown;
    const returning = mock(async () => [mockItem]);
    const where = mock(() => ({ returning }));
    const set = mock((values: unknown) => {
      capturedSetValues = values;
      return { where };
    });
    deps.db.update = mock(() => ({ set })) as typeof deps.db.update;

    const result = await postponeReview('test-id');

    expect(result.success).toBe(true);
    const setValues = capturedSetValues as { nextReviewAt: number };
    expect(typeof setValues.nextReviewAt).toBe('number');
  });

  test('uses custom interval when provided', async () => {
    const mockItem = createMockKnowledgeItem({ nextReviewAt: null });
    const from = mock(() => ({
      where: mock(async () => [mockItem]),
    }));
    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    const now = Date.now();
    const customInterval = 2 * 24 * 60 * 60 * 1000;
    let capturedSetValues: unknown;
    const returning = mock(async () => [mockItem]);
    const where = mock(() => ({ returning }));
    const set = mock((values: unknown) => {
      capturedSetValues = values;
      return { where };
    });
    deps.db.update = mock(() => ({ set })) as typeof deps.db.update;

    const result = await postponeReview('test-id', customInterval);

    expect(result.success).toBe(true);
    const setValues = capturedSetValues as { nextReviewAt: number };
    expect(setValues.nextReviewAt).toBeGreaterThanOrEqual(now + customInterval);
  });

  test('adds interval to existing nextReviewAt', async () => {
    const existingNextReview = 1_000_000_000;
    const mockItem = createMockKnowledgeItem({ nextReviewAt: existingNextReview });
    const from = mock(() => ({
      where: mock(async () => [mockItem]),
    }));
    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    let capturedSetValues: unknown;
    const returning = mock(async () => [mockItem]);
    const where = mock(() => ({ returning }));
    const set = mock((values: unknown) => {
      capturedSetValues = values;
      return { where };
    });
    deps.db.update = mock(() => ({ set })) as typeof deps.db.update;

    await postponeReview('test-id', DEFAULT_POSTPONE_INTERVAL_MS);

    const setValues = capturedSetValues as { nextReviewAt: number };
    expect(setValues.nextReviewAt).toBe(existingNextReview + DEFAULT_POSTPONE_INTERVAL_MS);
  });

  test('calls logger.info on success', async () => {
    const mockItem = createMockKnowledgeItem();
    const from = mock(() => ({
      where: mock(async () => [mockItem]),
    }));
    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    const returning = mock(async () => [mockItem]);
    const where = mock(() => ({ returning }));
    const set = mock(() => ({ where }));
    deps.db.update = mock(() => ({ set })) as typeof deps.db.update;

    await postponeReview('test-id');

    expect(deps.logger.info).toHaveBeenCalledWith(
      'Review postponed',
      expect.objectContaining({
        itemId: 'test-id',
      })
    );
  });

  test('returns DATABASE_ERROR when update throws', async () => {
    const mockItem = createMockKnowledgeItem();
    const from = mock(() => ({
      where: mock(async () => [mockItem]),
    }));
    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    deps.db.update = mock(() => {
      throw new Error('Update failed');
    }) as typeof deps.db.update;

    const result = await postponeReview('test-id');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
    expect(deps.logger.error).toHaveBeenCalled();
  });

  test('sets updatedAt to current time', async () => {
    const mockItem = createMockKnowledgeItem();
    const from = mock(() => ({
      where: mock(async () => [mockItem]),
    }));
    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    const beforeTime = Date.now();
    let capturedSetValues: unknown;
    const returning = mock(async () => [mockItem]);
    const where = mock(() => ({ returning }));
    const set = mock((values: unknown) => {
      capturedSetValues = values;
      return { where };
    });
    deps.db.update = mock(() => ({ set })) as typeof deps.db.update;

    await postponeReview('test-id');

    const setValues = capturedSetValues as { updatedAt: number };
    expect(setValues.updatedAt).toBeGreaterThanOrEqual(beforeTime);
  });

  test('returns updated item on success', async () => {
    const mockItem = createMockKnowledgeItem();
    const from = mock(() => ({
      where: mock(async () => [mockItem]),
    }));
    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    const updatedItem = createMockKnowledgeItem({ nextReviewAt: 1_700_000_000_000 });
    const returning = mock(async () => [updatedItem]);
    const where = mock(() => ({ returning }));
    const set = mock(() => ({ where }));
    deps.db.update = mock(() => ({ set })) as typeof deps.db.update;

    const result = await postponeReview('test-id');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nextReviewAt).toBe(1_700_000_000_000);
    }
  });
});
