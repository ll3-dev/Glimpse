import { describe, expect, test } from 'bun:test';
import { Effect, Exit } from 'effect';
import { stubProvider } from './stub-provider';

describe('stub provider', () => {
  test('is always available', async () => {
    const available = await stubProvider.isAvailable();
    expect(available).toBe(true);
  });

  test('generates summary from content', async () => {
    const effect = stubProvider.generate({
      content: 'This is a test content that should be summarized by the stub provider.',
    });
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.summary).toContain('[Stub Summary]');
      expect(exit.value.summary.length).toBeGreaterThan(0);
    }
  });

  test('includes title in summary when provided', async () => {
    const effect = stubProvider.generate({
      content: 'Article body content here.',
      title: 'Article Title',
    });
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.summary).toContain('Article Title');
    }
  });

  test('generates tags from content', async () => {
    const effect = stubProvider.generate({
      content: 'Check out https://example.com for more info. This is important todo item.',
    });
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.tags.length).toBeGreaterThan(0);
      // Should detect link
      expect(exit.value.tags).toContain('link');
    }
  });

  test('returns empty summary and tags for empty content', async () => {
    const effect = stubProvider.generate({
      content: '',
    });
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.summary).toBe('');
      expect(exit.value.tags).toEqual([]);
    }
  });

  test('returns empty summary and tags for whitespace-only content', async () => {
    const effect = stubProvider.generate({
      content: '   \n\t  ',
    });
    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.summary).toBe('');
      expect(exit.value.tags).toEqual([]);
    }
  });
});
