import { describe, expect, test } from 'bun:test';
import { generateSummaryStub, generateTagsStub } from './stubs';

describe('capture stubs', () => {
  test('generateSummaryStub returns empty string for blank content', () => {
    expect(generateSummaryStub('   ')).toBe('');
  });

  test('generateSummaryStub extracts the first complete sentence', () => {
    expect(generateSummaryStub('첫 문장입니다. 둘째 문장은 잘립니다.')).toBe('첫 문장입니다.');
    expect(generateSummaryStub('First sentence. Second one.')).toBe('First sentence.');
  });

  test('generateSummaryStub truncates long content at the boundary', () => {
    const long = 'a'.repeat(200);
    const summary = generateSummaryStub(long);
    expect(summary.length).toBeLessThanOrEqual(140);
    expect(summary.endsWith('...')).toBe(true);
  });

  test('generateTagsStub returns expected heuristic tags', () => {
    const tags = generateTagsStub(
      'Important todo: check http://example.com and brainstorm this idea'
    );
    expect(tags).toContain('important');
    expect(tags).toContain('todo');
    expect(tags).toContain('link');
    expect(tags).toContain('idea');
  });

  test('generateTagsStub returns unique tags', () => {
    const tags = generateTagsStub('important important important');
    const unique = new Set(tags);
    expect(unique.size).toBe(tags.length);
  });
});
