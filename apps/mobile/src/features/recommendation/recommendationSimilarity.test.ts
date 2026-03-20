import { describe, expect, test } from 'bun:test';
import { calculateTagOverlap } from './recommendationSimilarity';
import type { KnowledgeItem } from '@glimpse/shared';

describe('calculateTagOverlap', () => {
  test('returns 0 when both items have no tags', () => {
    const a = { tags: null } as KnowledgeItem;
    const b = { tags: null } as KnowledgeItem;
    expect(calculateTagOverlap(a, b)).toBe(0);
  });

  test('returns 0 when one item has no tags', () => {
    const a = { tags: ['tag1', 'tag2'] } as KnowledgeItem;
    const b = { tags: null } as KnowledgeItem;
    expect(calculateTagOverlap(a, b)).toBe(0);
  });

  test('returns 0 when tags do not overlap', () => {
    const a = { tags: ['tag1', 'tag2'] } as KnowledgeItem;
    const b = { tags: ['tag3', 'tag4'] } as KnowledgeItem;
    expect(calculateTagOverlap(a, b)).toBe(0);
  });

  test('returns correct count for partial overlap', () => {
    const a = { tags: ['tag1', 'tag2', 'tag3'] } as KnowledgeItem;
    const b = { tags: ['tag2', 'tag3', 'tag4'] } as KnowledgeItem;
    expect(calculateTagOverlap(a, b)).toBe(2);
  });

  test('returns full count when all tags overlap', () => {
    const a = { tags: ['tag1', 'tag2', 'tag3'] } as KnowledgeItem;
    const b = { tags: ['tag1', 'tag2', 'tag3'] } as KnowledgeItem;
    expect(calculateTagOverlap(a, b)).toBe(3);
  });

  test('handles duplicate tags by counting unique overlaps', () => {
    const a = { tags: ['tag1', 'tag1', 'tag2'] } as KnowledgeItem;
    const b = { tags: ['tag1', 'tag2', 'tag2'] } as KnowledgeItem;
    expect(calculateTagOverlap(a, b)).toBe(2);
  });

  test('handles empty tag arrays', () => {
    const a = { tags: [] } as KnowledgeItem;
    const b = { tags: ['tag1'] } as KnowledgeItem;
    expect(calculateTagOverlap(a, b)).toBe(0);
  });

  test('handles undefined tags', () => {
    const a = { tags: undefined } as KnowledgeItem;
    const b = { tags: ['tag1'] } as KnowledgeItem;
    expect(calculateTagOverlap(a, b)).toBe(0);
  });
});
