import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { Effect, Cause, Option } from 'effect';
import { loadKnowledgeItemOrFail } from './reviewActions.shared';
import type { ReviewActionsDeps } from './reviewActions.types';
import type { KnowledgeItem } from '@/src/db';

const createMockDeps = () => {
  const select = mock();
  const db = { select };
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

describe('loadKnowledgeItemOrFail', () => {
  let deps: ReviewActionsDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  test('returns item when found', async () => {
    const mockItem: KnowledgeItem = {
      id: 'item-1',
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
    };

    const from = mock(() => ({
      where: mock(async () => [mockItem]),
    }));

    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    const effect = loadKnowledgeItemOrFail(deps, 'item-1');
    const result = await Effect.runPromise(effect);

    expect(result).toEqual(mockItem);
  });

  test('fails with NOT_FOUND when item does not exist', async () => {
    const from = mock(() => ({
      where: mock(async () => []),
    }));

    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    const effect = loadKnowledgeItemOrFail(deps, 'missing-id');
    const exit = await Effect.runPromiseExit(effect);

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      const failure = Cause.failureOption(exit.cause);
      expect(Option.isSome(failure)).toBe(true);
      if (Option.isSome(failure)) {
        expect(failure.value.code).toBe('NOT_FOUND');
        expect(failure.value.message).toBe('Item not found');
      }
    }
  });

  test('fails with DATABASE_ERROR when query throws', async () => {
    const from = mock(() => ({
      where: mock(async () => {
        throw new Error('DB connection failed');
      }),
    }));

    deps.db.select = mock(() => ({ from })) as typeof deps.db.select;

    const effect = loadKnowledgeItemOrFail(deps, 'item-1');
    const exit = await Effect.runPromiseExit(effect);

    expect(exit._tag).toBe('Failure');
    if (exit._tag === 'Failure') {
      const failure = Cause.failureOption(exit.cause);
      expect(Option.isSome(failure)).toBe(true);
      if (Option.isSome(failure)) {
        expect(failure.value.code).toBe('DATABASE_ERROR');
      }
    }
  });

  test('calls select with correct table and where clause', async () => {
    const from = mock(() => ({
      where: mock(async () => []),
    }));
    const select = mock(() => ({ from }));

    deps.db.select = select as typeof deps.db.select;
    deps.eq = mock((left, right) => ({ left, right })) as typeof deps.eq;

    const effect = loadKnowledgeItemOrFail(deps, 'test-id');
    await Effect.runPromiseExit(effect);

    expect(select).toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith(deps.knowledgeItems);
    expect(deps.eq).toHaveBeenCalledWith(deps.knowledgeItems.id, 'test-id');
  });
});
