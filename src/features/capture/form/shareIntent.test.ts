import { describe, expect, test } from 'bun:test';
import { parseShareIntent } from './shareIntent';

describe('parseShareIntent', () => {
  test('returns empty sharedContent for empty input', () => {
    const result = parseShareIntent({});
    expect(result.sharedContent).toEqual({});
    expect(result.shareText).toBeUndefined();
    expect(result.shareUrl).toBeUndefined();
  });

  test('parses text content', () => {
    const result = parseShareIntent({ text: 'Hello world' });
    expect(result.sharedContent.text).toBe('Hello world');
    expect(result.shareText).toBe('Hello world');
  });

  test('parses webUrl', () => {
    const result = parseShareIntent({ webUrl: 'https://example.com' });
    expect(result.sharedContent.url).toBe('https://example.com');
    expect(result.shareUrl).toBe('https://example.com');
  });

  test('parses files and uses first file path', () => {
    const result = parseShareIntent({
      files: [{ path: '/path/to/image.jpg' }],
    });
    expect(result.sharedContent.imageUri).toBe('/path/to/image.jpg');
  });

  test('handles multiple files by using only first', () => {
    const result = parseShareIntent({
      files: [
        { path: '/path/to/first.jpg' },
        { path: '/path/to/second.jpg' },
      ],
    });
    expect(result.sharedContent.imageUri).toBe('/path/to/first.jpg');
  });

  test('handles empty files array', () => {
    const result = parseShareIntent({ files: [] });
    expect(result.sharedContent.imageUri).toBeUndefined();
  });

  test('handles null values', () => {
    const result = parseShareIntent({
      text: null,
      webUrl: null,
      files: null,
    });
    expect(result.sharedContent).toEqual({});
    expect(result.shareText).toBeUndefined();
    expect(result.shareUrl).toBeUndefined();
  });

  test('parses all content types together', () => {
    const result = parseShareIntent({
      text: 'Shared text',
      webUrl: 'https://example.com',
      files: [{ path: '/path/to/image.jpg' }],
    });

    expect(result.sharedContent.text).toBe('Shared text');
    expect(result.sharedContent.url).toBe('https://example.com');
    expect(result.sharedContent.imageUri).toBe('/path/to/image.jpg');
    expect(result.shareText).toBe('Shared text');
    expect(result.shareUrl).toBe('https://example.com');
  });

  test('handles text with webUrl', () => {
    const result = parseShareIntent({
      text: 'Check this out',
      webUrl: 'https://example.com/article',
    });

    expect(result.sharedContent.text).toBe('Check this out');
    expect(result.sharedContent.url).toBe('https://example.com/article');
    expect(result.shareText).toBe('Check this out');
    expect(result.shareUrl).toBe('https://example.com/article');
  });
});
