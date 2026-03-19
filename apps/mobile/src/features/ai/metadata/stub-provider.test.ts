import { describe, expect, test } from 'bun:test';
import { stubProvider } from './stub-provider';

describe('stub provider', () => {
  test('is always available', async () => {
    const available = await stubProvider.isAvailable();
    expect(available).toBe(true);
  });

  test('generates summary from content', async () => {
    const result = await stubProvider.generate({
      content: 'This is a test content that should be summarized by the stub provider.',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toContain('[Stub Summary]');
      expect(result.data.summary.length).toBeGreaterThan(0);
    }
  });

  test('includes title in summary when provided', async () => {
    const result = await stubProvider.generate({
      content: 'Article body content here.',
      title: 'Article Title',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toContain('Article Title');
    }
  });

  test('generates tags from content', async () => {
    const result = await stubProvider.generate({
      content: 'Check out https://example.com for more info. This is important todo item.',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags.length).toBeGreaterThan(0);
      // Should detect link
      expect(result.data.tags).toContain('link');
    }
  });

  test('returns empty summary and tags for empty content', async () => {
    const result = await stubProvider.generate({
      content: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toBe('');
      expect(result.data.tags).toEqual([]);
    }
  });

  test('returns empty summary and tags for whitespace-only content', async () => {
    const result = await stubProvider.generate({
      content: '   \n\t  ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toBe('');
      expect(result.data.tags).toEqual([]);
    }
  });
});
