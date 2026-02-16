import { describe, expect, test } from 'bun:test';
import { parseQueryToKeyword } from './parseQueryToKeyword';

describe('parseQueryToKeyword', () => {
  test('returns empty string for blank input', () => {
    expect(parseQueryToKeyword('   ')).toBe('');
  });

  test('extracts Korean keyword from related-question pattern', () => {
    expect(parseQueryToKeyword('리액트 관련 있어?')).toBe('리액트');
  });

  test('extracts Korean keyword and removes trailing particle', () => {
    expect(parseQueryToKeyword('리액트를 찾아줘')).toBe('리액트');
  });

  test('extracts English keyword from question pattern', () => {
    expect(parseQueryToKeyword('what is React Native')).toBe('React Native');
  });

  test('extracts English keyword from search command pattern', () => {
    expect(parseQueryToKeyword('search for sqlite indexing')).toBe('sqlite indexing');
  });

  test('returns trimmed query when no pattern matches', () => {
    expect(parseQueryToKeyword('  just-a-keyword  ')).toBe('just-a-keyword');
  });

  test('falls back to full sentence when parser cannot extract keyword', () => {
    expect(parseQueryToKeyword('이거 가능할까?')).toBe('이거 가능할까?');
  });
});
