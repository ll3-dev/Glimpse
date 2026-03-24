import { describe, expect, test } from 'bun:test';
import {
  buildSummaryPrompt,
  buildTagsPrompt,
  parseTagsResponse,
} from './metadata-text';

describe('buildSummaryPrompt', () => {
  test('builds prompt with content only', () => {
    const prompt = buildSummaryPrompt({ content: 'Test content' });
    expect(prompt).toContain('Test content');
    expect(prompt).toContain('Summarize');
  });

  test('builds prompt with title and content', () => {
    const prompt = buildSummaryPrompt({
      title: 'Test Title',
      content: 'Test content',
    });
    expect(prompt).toContain('Title: Test Title');
    expect(prompt).toContain('Test content');
  });

  test('does not include title when undefined', () => {
    const prompt = buildSummaryPrompt({
      content: 'Test content',
      title: undefined,
    });
    expect(prompt).not.toContain('Title:');
    expect(prompt).toContain('Test content');
  });
});

describe('buildTagsPrompt', () => {
  test('builds prompt for tag extraction', () => {
    const prompt = buildTagsPrompt({ content: 'Test content' });
    expect(prompt).toContain('Test content');
    expect(prompt).toContain('tags');
    expect(prompt).toContain('comma-separated');
  });

  test('builds prompt with title and content', () => {
    const prompt = buildTagsPrompt({
      title: 'Test Title',
      content: 'Test content',
    });
    expect(prompt).toContain('Title: Test Title');
    expect(prompt).toContain('Test content');
  });
});

describe('parseTagsResponse', () => {
  test('parses comma-separated tags', () => {
    const tags = parseTagsResponse('apple, banana, cherry');
    expect(tags).toEqual(['apple', 'banana', 'cherry']);
  });

  test('parses newline-separated tags', () => {
    const tags = parseTagsResponse('apple\nbanana\ncherry');
    expect(tags).toEqual(['apple', 'banana', 'cherry']);
  });

  test('removes quotes and hash symbols', () => {
    const tags = parseTagsResponse('"apple", #banana, \'cherry\'');
    expect(tags).toEqual(['apple', 'banana', 'cherry']);
  });

  test('limits to 5 tags', () => {
    const tags = parseTagsResponse('a, b, c, d, e, f, g');
    expect(tags.length).toBe(5);
  });

  test('returns unique tags', () => {
    const tags = parseTagsResponse('apple, banana, apple, cherry');
    expect(tags).toEqual(['apple', 'banana', 'cherry']);
  });

  test('filters empty tags', () => {
    const tags = parseTagsResponse('apple, , banana, , cherry');
    expect(tags).toEqual(['apple', 'banana', 'cherry']);
  });

  test('filters tags longer than 50 characters', () => {
    const longTag = 'a'.repeat(60);
    const tags = parseTagsResponse(`short, ${longTag}, another`);
    expect(tags).toEqual(['short', 'another']);
  });
});
