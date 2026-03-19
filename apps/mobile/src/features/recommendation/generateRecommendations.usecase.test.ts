import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createGenerateRecommendations } from './generateRecommendations.usecase';
import type {
  GenerateRecommendationsDeps,
  GeneratedRecommendation,
} from './generateRecommendations.types';
import type { KnowledgeItem } from '@/src/db';

const createMockKnowledgeItem = (id: string, tags: string[] | null): KnowledgeItem => ({
  id,
  type: 'note',
  title: `Item ${id}`,
  body: `Body for ${id}`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags,
  lastReviewedAt: null,
  nextReviewAt: null,
  reviewCount: 0,
  embedding: null,
  summary: null,
});

describe('createGenerateRecommendations', () => {
  const select = mock();
  const db = { select };
  const recommendations = { id: 'rec_id' };

  const mockDeps = {
    db,
    recommendations,
    getWeeklyItems: mock(),
  } as unknown as GenerateRecommendationsDeps;

  let generateRecommendations: ReturnType<typeof createGenerateRecommendations>;

  beforeEach(() => {
    mockDeps.db.select = mock();
    mockDeps.getWeeklyItems = mock();
    generateRecommendations = createGenerateRecommendations(mockDeps);
  });

  test('returns empty array when less than 2 items', async () => {
    mockDeps.getWeeklyItems = mock(async () => ({
      success: true,
      data: [createMockKnowledgeItem('1', ['tag1'])],
    })) as typeof mockDeps.getWeeklyItems;

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  test('returns empty array when no weekly items', async () => {
    mockDeps.getWeeklyItems = mock(async () => ({
      success: true,
      data: [],
    })) as typeof mockDeps.getWeeklyItems;

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  test('returns error when getWeeklyItems fails', async () => {
    mockDeps.getWeeklyItems = mock(async () => ({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'DB error' },
    })) as typeof mockDeps.getWeeklyItems;

    const result = await generateRecommendations();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
  });

  test('generates recommendations for items with overlapping tags', async () => {
    const item1 = createMockKnowledgeItem('1', ['tag1', 'tag2', 'shared']);
    const item2 = createMockKnowledgeItem('2', ['tag3', 'shared']);
    const item3 = createMockKnowledgeItem('3', ['tag4']);

    mockDeps.getWeeklyItems = mock(async () => ({
      success: true,
      data: [item1, item2, item3],
    })) as typeof mockDeps.getWeeklyItems;

    const from = mock(async () => []);
    mockDeps.db.select = mock(() => ({ from })) as typeof mockDeps.db.select;

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(1);
      const rec = result.data[0] as GeneratedRecommendation;
      expect(rec.itemA.id).toBe('1');
      expect(rec.itemB.id).toBe('2');
      expect(rec.reason).toContain('공통 태그');
    }
  });

  test('excludes pairs that already exist in recommendations', async () => {
    const item1 = createMockKnowledgeItem('1', ['shared']);
    const item2 = createMockKnowledgeItem('2', ['shared']);

    mockDeps.getWeeklyItems = mock(async () => ({
      success: true,
      data: [item1, item2],
    })) as typeof mockDeps.getWeeklyItems;

    const from = mock(async () => [{ itemA_id: '1', itemB_id: '2' }]);
    mockDeps.db.select = mock(() => ({ from })) as typeof mockDeps.db.select;

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  test('excludes pairs that exist in reverse order', async () => {
    const item1 = createMockKnowledgeItem('1', ['shared']);
    const item2 = createMockKnowledgeItem('2', ['shared']);

    mockDeps.getWeeklyItems = mock(async () => ({
      success: true,
      data: [item1, item2],
    })) as typeof mockDeps.getWeeklyItems;

    const from = mock(async () => [{ itemA_id: '2', itemB_id: '1' }]);
    mockDeps.db.select = mock(() => ({ from })) as typeof mockDeps.db.select;

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  test('returns empty when no overlapping tags', async () => {
    const item1 = createMockKnowledgeItem('1', ['tag1']);
    const item2 = createMockKnowledgeItem('2', ['tag2']);

    mockDeps.getWeeklyItems = mock(async () => ({
      success: true,
      data: [item1, item2],
    })) as typeof mockDeps.getWeeklyItems;

    const from = mock(async () => []);
    mockDeps.db.select = mock(() => ({ from })) as typeof mockDeps.db.select;

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  test('handles multiple overlapping pairs', async () => {
    const item1 = createMockKnowledgeItem('1', ['shared']);
    const item2 = createMockKnowledgeItem('2', ['shared']);
    const item3 = createMockKnowledgeItem('3', ['shared']);

    mockDeps.getWeeklyItems = mock(async () => ({
      success: true,
      data: [item1, item2, item3],
    })) as typeof mockDeps.getWeeklyItems;

    const from = mock(async () => []);
    mockDeps.db.select = mock(() => ({ from })) as typeof mockDeps.db.select;

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(3);
    }
  });
});
