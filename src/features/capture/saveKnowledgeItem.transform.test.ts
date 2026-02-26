import { describe, expect, test } from 'bun:test';
import {
  generateId,
  normalizeText,
  createContentForProcessing,
} from './saveKnowledgeItem.transform';
import type { KnowledgeItemInput } from './saveKnowledgeItem.types';

describe('generateId', () => {
  test('generates a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  test('ID uses UUID-like format without spaces', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThanOrEqual(21);
    expect(id).not.toContain(' ');
  });
});

describe('normalizeText', () => {
  test('returns undefined for undefined input', () => {
    expect(normalizeText(undefined)).toBeUndefined();
  });

  test('returns undefined for empty string', () => {
    expect(normalizeText('')).toBeUndefined();
  });

  test('returns undefined for whitespace-only string', () => {
    expect(normalizeText('   ')).toBeUndefined();
  });

  test('trims leading and trailing whitespace', () => {
    expect(normalizeText('  hello world  ')).toBe('hello world');
  });

  test('preserves internal whitespace', () => {
    expect(normalizeText('hello   world')).toBe('hello   world');
  });

  test('returns trimmed non-empty string', () => {
    expect(normalizeText('valid text')).toBe('valid text');
  });
});

describe('createContentForProcessing', () => {
  test('returns empty string for input with no content', () => {
    const input: KnowledgeItemInput = { type: 'note', body: '' };
    expect(createContentForProcessing(input)).toBe('');
  });

  test('includes title when present', () => {
    const input: KnowledgeItemInput = {
      type: 'note',
      title: 'My Title',
      body: 'My Body',
    };
    const content = createContentForProcessing(input);
    expect(content).toContain('My Title');
    expect(content).toContain('My Body');
  });

  test('includes body when present', () => {
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

  test('includes URL for share type', () => {
    const input: KnowledgeItemInput = {
      type: 'share',
      url: 'https://shared.com',
      body: 'Shared content',
    };
    const content = createContentForProcessing(input);
    expect(content).toContain('https://shared.com');
  });

  test('does not include URL for non-link/share types', () => {
    const input: KnowledgeItemInput = {
      type: 'highlight',
      body: 'Highlight text',
      title: 'Source',
    };
    const content = createContentForProcessing(input);
    expect(content).not.toContain('http');
    expect(content).toBe('Source\nHighlight text');
  });

  test('joins parts with newline', () => {
    const input: KnowledgeItemInput = {
      type: 'note',
      title: 'Title',
      body: 'Body',
    };
    expect(createContentForProcessing(input)).toBe('Title\nBody');
  });
});
