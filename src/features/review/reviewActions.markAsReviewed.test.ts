import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createMarkAsReviewed } from './reviewActions.markAsReviewed';
import type { ReviewActionsDeps } from './reviewActions.types';
import type { KnowledgeItem } from '@/src/db';

const createMockKnowledgeItem = (overrides?: Partial<KnowledgeItem>): KnowledgeItem => ({
  id: 'test-id',
  type: 'note',
  title: 'Test Note',
  body: 'Test body',
  createdAt: 1000,
  updatedAt: 1000,
  tags: null,
  lastReviewedAt: null,
  nextReviewAt: null,
  reviewCount: 0,
  embedding: null,
  summary: null,
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

describe('createMarkAsReviewed', () => {
  let deps: ReviewActionsDeps;
  let markAsReviewed: ReturnType<typeof createMarkAsReviewed>;

  beforeEach(() => {
    deps = createMockDeps();
    markAsReviewed = createMarkAsReviewed(deps);
  });

  test('returns NOT_FOUND when item does not exist', async () => {
    const from = mock(() => ({
      where: mock(async () => []),
    }));
    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    const result = await markAsReviewed('missing-id');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  test('updates review schedule and returns updated row', async () => {
    const mockItem = createMockKnowledgeItem();
    const from = mock(() => ({
      where: mock(async () => [mockItem]),
    }));
    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    const returning = mock(async () => [createMockKnowledgeItem({ nextReviewAt: 1_700_000_123_000 })]);
    const where = mock(() => ({ returning }));
    const set = mock(() => ({ where }));
    deps.db.update = mock(() => ({ set })) as typeof deps.db.update;

    const result = await markAsReviewed('test-id', 'remembered');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('test-id');
    }
    expect(deps.calculateNextReviewFromFeedback).toHaveBeenCalledWith(
      null,
      null,
      'remembered'
    );
  });

  test('uses default feedback type of remembered', async () => {
    const mockItem = createMockKnowledgeItem();
    const from = mock(() => ({
      where: mock(async () => [mockItem]),
    }));
    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    const returning = mock(async () => [mockItem]);
    const where = mock(() => ({ returning }));
    const set = mock(() => ({ where }));
    deps.db.update = mock(() => ({ set })) as typeof deps.db.update;

    await markAsReviewed('test-id');

    expect(deps.calculateNextReviewFromFeedback).toHaveBeenCalledWith(
      null,
      null,
      'remembered'
    );
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

    await markAsReviewed('test-id', 'remembered');

    expect(deps.logger.info).toHaveBeenCalledWith(
      'Item marked as reviewed',
      expect.objectContaining({
        itemId: 'test-id',
        feedbackType: 'remembered',
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

    const result = await markAsReviewed('test-id');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
    expect(deps.logger.error).toHaveBeenCalled();
  });

  test('handles different feedback types', async () => {
    const mockItem = createMockKnowledgeItem();
    const from = mock(() => ({
      where: mock(async () => [mockItem]),
    }));
    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    const returning = mock(async () => [mockItem]);
    const where = mock(() => ({ returning }));
    const set = mock(() => ({ where }));
    deps.db.update = mock(() => ({ set })) as typeof deps.db.update;

    await markAsReviewed('test-id', 'forgot');

    expect(deps.calculateNextReviewFromFeedback).toHaveBeenCalledWith(
      null,
      null,
      'forgot'
    );
  });

  test('sets correct update fields', async () => {
    const mockItem = createMockKnowledgeItem();
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

    await markAsReviewed('test-id');

    const setValues = capturedSetValues as {
      provisionalLabels: null;
      labelStatus: string;
      labelSource: string;
      labelVersion: null;
      labelScore: null;
      labelRequestedAt: number;
      labelCompletedAt: null;
      labelError: null;
      lastReviewedAt: number;
      nextReviewAt: number;
      updatedAt: number;
    };
    expect(setValues.provisionalLabels).toBeNull();
    expect(setValues.labelStatus).toBe('pending');
    expect(setValues.labelSource).toBe('none');
    expect(setValues.labelVersion).toBeNull();
    expect(setValues.labelScore).toBeNull();
    expect(typeof setValues.labelRequestedAt).toBe('number');
    expect(setValues.labelCompletedAt).toBeNull();
    expect(setValues.labelError).toBeNull();
    expect(typeof setValues.lastReviewedAt).toBe('number');
    expect(typeof setValues.nextReviewAt).toBe('number');
    expect(typeof setValues.updatedAt).toBe('number');
  });
});
