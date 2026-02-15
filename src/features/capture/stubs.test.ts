import { describe, expect, test } from 'bun:test';
import { generateSummaryStub, generateTagsStub } from './stubs';

describe('capture stubs', () => {
  test('generateSummaryStub returns empty string for blank content', () => {
    expect(generateSummaryStub('   ')).toBe('');
  });

  test('generateSummaryStub prefixes preview and truncates long content', () => {
    const long = 'a'.repeat(120);
    const summary = generateSummaryStub(long);
    expect(summary.startsWith('[Stub Summary]')).toBe(true);
    expect(summary.endsWith('...')).toBe(true);
  });

  test('generateTagsStub returns expected heuristic tags', () => {
    const tags = generateTagsStub(
      'Important todo: check http://example.com and brainstorm this idea'
    );
    expect(tags).toContain('stub-tag');
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
