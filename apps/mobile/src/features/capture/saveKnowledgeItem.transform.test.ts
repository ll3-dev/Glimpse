import { describe, expect, test } from 'bun:test';
import {
  normalizeText,
  createContentForProcessing,
} from './saveKnowledgeItem.transform';
import type { KnowledgeItemInput } from './saveKnowledgeItem.types';

describe('normalizeText', () => {
  test('trims leading and trailing whitespace', () => {
    expect(normalizeText('  hello world  ')).toBe('hello world');
  });

  test('collapses repeated whitespace into single spaces', () => {
    expect(normalizeText('hello   world')).toBe('hello world');
  });

  test('returns empty string for empty input', () => {
    expect(normalizeText('')).toBe('');
  });

  test('returns empty string for whitespace-only input', () => {
    expect(normalizeText('   ')).toBe('');
  });

  test('returns trimmed non-empty string', () => {
    expect(normalizeText('valid text')).toBe('valid text');
  });
});

describe('createContentForProcessing', () => {
  test('combines title and body for note input', () => {
    const input: KnowledgeItemInput = {
      type: 'note',
      title: 'Title',
      body: 'Body',
    };
    expect(createContentForProcessing(input)).toBe('Title\n\nBody');
  });

  test('returns body only when no title', () => {
    const input: KnowledgeItemInput = {
      type: 'note',
      body: 'Just body',
    };
    expect(createContentForProcessing(input)).toBe('Just body');
  });

  test('includes URL for link type', () => {
    const input: KnowledgeItemInput = {
      type: 'link',
      url: 'https://example.com',
      body: 'Link body',
    };
    const content = createContentForProcessing(input);
    expect(content).toContain('https://example.com');
  });

  test('does not include URL for non-link types', () => {
    const input: KnowledgeItemInput = {
      type: 'highlight',
      body: 'Highlight text',
      title: 'Source',
    };
    const content = createContentForProcessing(input);
    expect(content).not.toContain('http');
  });
});
