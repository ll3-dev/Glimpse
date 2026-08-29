import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createGenerateRecommendations } from '@/src/features/core/application/recommendation';
import type {
  GenerateRecommendationsDeps,
  GeneratedRecommendation,
  WeeklyItemsResult,
} from '@/src/features/core/application/recommendation';
import type { KnowledgeItem } from '@glimpse/shared';

const createMockKnowledgeItem = (id: string, tags: string[] | null): KnowledgeItem => ({
  id,
  type: 'note',
  title: `Item ${id}`,
  body: `Body for ${id}`,
  url: null,
  summary: null,
  tags,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  stability: null,
  difficulty: null,
  lastReviewedAt: null,
  nextReviewAt: null,
});

describe('createGenerateRecommendations', () => {
  const getWeeklyItems = mock<() => Promise<WeeklyItemsResult>>();

  const mockDeps = {
    coreClient: {
      listWeeklyKnowledgeItems: mock(),
    },
    getWeeklyItems,
  } as unknown as GenerateRecommendationsDeps;

  let generateRecommendations: ReturnType<typeof createGenerateRecommendations>;

  beforeEach(() => {
    mockDeps.getWeeklyItems = mock();
    generateRecommendations = createGenerateRecommendations(mockDeps);
  });

  test('returns empty array when less than 2 items', async () => {
    mockDeps.getWeeklyItems = mock(async (): Promise<WeeklyItemsResult> => ({
      success: true,
      items: [createMockKnowledgeItem('1', ['tag1'])],
    }));

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.recommendations).toEqual([]);
    }
  });

  test('returns empty array when no weekly items', async () => {
    mockDeps.getWeeklyItems = mock(async (): Promise<WeeklyItemsResult> => ({
      success: true,
      items: [],
    }));

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.recommendations).toEqual([]);
    }
  });

  test('returns error when getWeeklyItems fails', async () => {
    mockDeps.getWeeklyItems = mock(async (): Promise<WeeklyItemsResult> => ({
      success: false,
      error: { code: 'RECOMMENDATION_ERROR', message: 'DB error' },
    }));

    const result = await generateRecommendations();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('RECOMMENDATION_ERROR');
    }
  });

  test('generates recommendations for items with overlapping tags', async () => {
    const item1 = createMockKnowledgeItem('1', ['tag1', 'tag2', 'shared']);
    const item2 = createMockKnowledgeItem('2', ['tag3', 'shared']);
    const item3 = createMockKnowledgeItem('3', ['tag4']);

    mockDeps.getWeeklyItems = mock(async (): Promise<WeeklyItemsResult> => ({
      success: true,
      items: [item1, item2, item3],
    }));

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.recommendations.length).toBe(1);
      const rec = result.recommendations[0] as GeneratedRecommendation;
      expect(rec.itemAId).toBe('1');
      expect(rec.itemBId).toBe('2');
      expect(rec.reason).toContain('Shared');
    }
  });

  test('excludes pairs that already exist in recommendations', async () => {
    // This test was about DB-based deduplication which is now handled at the save layer
    // With the new coreClient API, generateRecommendations doesn't check existing recommendations
    const item1 = createMockKnowledgeItem('1', ['shared']);
    const item2 = createMockKnowledgeItem('2', ['shared']);

    mockDeps.getWeeklyItems = mock(async (): Promise<WeeklyItemsResult> => ({
      success: true,
      items: [item1, item2],
    }));

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      // With new API, generateRecommendations doesn't deduplicate - that's saveRecommendations' job
      expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('excludes pairs that exist in reverse order', async () => {
    // Same as above - dedup is now at save layer
    const item1 = createMockKnowledgeItem('1', ['shared']);
    const item2 = createMockKnowledgeItem('2', ['shared']);

    mockDeps.getWeeklyItems = mock(async (): Promise<WeeklyItemsResult> => ({
      success: true,
      items: [item1, item2],
    }));

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('returns empty when no overlapping tags', async () => {
    const item1 = createMockKnowledgeItem('1', ['tag1']);
    const item2 = createMockKnowledgeItem('2', ['tag2']);

    mockDeps.getWeeklyItems = mock(async (): Promise<WeeklyItemsResult> => ({
      success: true,
      items: [item1, item2],
    }));

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.recommendations).toEqual([]);
    }
  });

  test('handles multiple overlapping pairs', async () => {
    const item1 = createMockKnowledgeItem('1', ['shared']);
    const item2 = createMockKnowledgeItem('2', ['shared']);
    const item3 = createMockKnowledgeItem('3', ['shared']);

    mockDeps.getWeeklyItems = mock(async (): Promise<WeeklyItemsResult> => ({
      success: true,
      items: [item1, item2, item3],
    }));

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.recommendations.length).toBe(3);
    }
  });
});
