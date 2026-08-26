import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { cosineSimilarity, rankBySemanticSimilarity } from './semantic';

function item(id: string): KnowledgeItem {
  return {
    id,
    type: 'note',
    title: id,
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
    createdAt: 1,
    updatedAt: 1,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
  };
}

describe('cosineSimilarity', () => {
  test('identical vectors score 1, orthogonal score 0', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([2, 0], [4, 0])).toBeCloseTo(1); // magnitude-independent
  });

  test('mismatched or empty vectors are neutral', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });
});

describe('rankBySemanticSimilarity', () => {
  test('orders by similarity and keeps keyword order for ties and missing vectors', () => {
    const items = [item('a'), item('b'), item('c')];
    const ranked = rankBySemanticSimilarity(items, {
      queryEmbedding: [1, 0],
      itemEmbeddings: new Map([
        ['a', [0.1, 0.9]], // least aligned
        ['b', [0.9, 0.1]], // most aligned
        // 'c' has no vector — must come last, after keyword order among nulls
      ]),
    });

    expect(ranked.map((entry) => entry.item.id)).toEqual(['b', 'a', 'c']);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  test('empty query embedding preserves keyword order with zero scores', () => {
    const items = [item('x'), item('y')];
    const ranked = rankBySemanticSimilarity(items, {
      queryEmbedding: [],
      itemEmbeddings: new Map([['y', [1, 1]]]),
    });
    expect(ranked.map((entry) => entry.item.id)).toEqual(['x', 'y']);
    expect(ranked.every((entry) => entry.score === 0)).toBe(true);
  });
});
