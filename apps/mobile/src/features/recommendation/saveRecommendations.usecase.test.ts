import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createSaveRecommendations } from './saveRecommendations.usecase';
import type { SaveRecommendationsDeps, GeneratedRecommendation } from './generateRecommendations.types';
import type { KnowledgeItem } from '@glimpse/shared';

const createMockKnowledgeItem = (id: string): KnowledgeItem => ({
  id,
  type: 'note',
  title: `Item ${id}`,
  body: `Body for ${id}`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags: null,
  lastReviewedAt: null,
  nextReviewAt: null,
  reviewCount: 0,
  embedding: null,
  summary: null,
});

describe('createSaveRecommendations', () => {
  const insert = mock();
  const db = { insert };
  const recommendations = { id: 'rec_id' };
  const nanoid = mock(() => 'test-id-123');

  const mockDeps = {
    db,
    recommendations,
    nanoid,
  } as unknown as SaveRecommendationsDeps;

  let saveRecommendations: ReturnType<typeof createSaveRecommendations>;

  beforeEach(() => {
    mockDeps.db.insert = mock();
    mockDeps.nanoid = mock(() => 'test-id-123');
    saveRecommendations = createSaveRecommendations(mockDeps);
  });

  test('returns success for empty recommendations list', async () => {
    const result = await saveRecommendations([]);

    expect(result.success).toBe(true);
  });

  test('inserts recommendations with correct structure', async () => {
    const item1 = createMockKnowledgeItem('item-1');
    const item2 = createMockKnowledgeItem('item-2');

    const recommendationsList: GeneratedRecommendation[] = [
      {
        itemA: item1,
        itemB: item2,
        reason: '공통 태그 2개',
      },
    ];

    const valuesMock = mock(async () => undefined);
    const insertMock = mock(() => ({ values: valuesMock }));
    mockDeps.db.insert = insertMock as typeof mockDeps.db.insert;

    const result = await saveRecommendations(recommendationsList);

    expect(result.success).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(mockDeps.recommendations);
    expect(valuesMock).toHaveBeenCalled();
  });

  test('generates unique ID for each recommendation', async () => {
    const item1 = createMockKnowledgeItem('item-1');
    const item2 = createMockKnowledgeItem('item-2');

    const recommendationsList: GeneratedRecommendation[] = [
      { itemA: item1, itemB: item2, reason: 'reason 1' },
    ];

    let capturedValues: unknown;
    const valuesMock = mock((vals: unknown) => {
      capturedValues = vals;
      return Promise.resolve(undefined);
    });
    const insertMock = mock(() => ({ values: valuesMock }));
    mockDeps.db.insert = insertMock as typeof mockDeps.db.insert;
    mockDeps.nanoid = mock(() => 'unique-id-123');

    await saveRecommendations(recommendationsList);

    expect(mockDeps.nanoid).toHaveBeenCalled();
    const inserted = capturedValues as { id: string }[];
    expect(inserted[0].id).toBe('unique-id-123');
  });

  test('sets status to pending', async () => {
    const item1 = createMockKnowledgeItem('item-1');
    const item2 = createMockKnowledgeItem('item-2');

    const recommendationsList: GeneratedRecommendation[] = [
      { itemA: item1, itemB: item2, reason: 'reason' },
    ];

    let capturedValues: unknown;
    const valuesMock = mock((vals: unknown) => {
      capturedValues = vals;
      return Promise.resolve(undefined);
    });
    const insertMock = mock(() => ({ values: valuesMock }));
    mockDeps.db.insert = insertMock as typeof mockDeps.db.insert;

    await saveRecommendations(recommendationsList);

    const inserted = capturedValues as { status: string }[];
    expect(inserted[0].status).toBe('pending');
  });

  test('returns DATABASE_ERROR when insert fails', async () => {
    const item1 = createMockKnowledgeItem('item-1');
    const item2 = createMockKnowledgeItem('item-2');

    const recommendationsList: GeneratedRecommendation[] = [
      { itemA: item1, itemB: item2, reason: 'reason' },
    ];

    const valuesMock = mock(async () => {
      throw new Error('Insert failed');
    });
    const insertMock = mock(() => ({ values: valuesMock }));
    mockDeps.db.insert = insertMock as typeof mockDeps.db.insert;

    const result = await saveRecommendations(recommendationsList);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
  });

  test('handles multiple recommendations', async () => {
    const item1 = createMockKnowledgeItem('item-1');
    const item2 = createMockKnowledgeItem('item-2');
    const item3 = createMockKnowledgeItem('item-3');

    const recommendationsList: GeneratedRecommendation[] = [
      { itemA: item1, itemB: item2, reason: 'reason 1' },
      { itemA: item1, itemB: item3, reason: 'reason 2' },
    ];

    let capturedValues: unknown;
    const valuesMock = mock((vals: unknown) => {
      capturedValues = vals;
      return Promise.resolve(undefined);
    });
    const insertMock = mock(() => ({ values: valuesMock }));
    mockDeps.db.insert = insertMock as typeof mockDeps.db.insert;

    const result = await saveRecommendations(recommendationsList);

    expect(result.success).toBe(true);
    const inserted = capturedValues as unknown[];
    expect(inserted.length).toBe(2);
  });
});
