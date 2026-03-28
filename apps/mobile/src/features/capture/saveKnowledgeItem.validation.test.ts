import { describe, expect, test } from 'bun:test';
import { validateInput } from './saveKnowledgeItem.validation';
import type { KnowledgeItemInput } from './saveKnowledgeItem.types';

describe('validateInput', () => {
  describe('note type', () => {
    test('returns empty array for valid note input', () => {
      const input: KnowledgeItemInput = { type: 'note', body: 'Valid body' };
      expect(validateInput(input)).toEqual([]);
    });

    test('returns error for empty body', () => {
      const input: KnowledgeItemInput = { type: 'note', body: '' };
      expect(validateInput(input)).toEqual([
        { field: 'body', message: 'Body is required for notes' },
      ]);
    });

    test('returns error for whitespace-only body', () => {
      const input: KnowledgeItemInput = { type: 'note', body: '   ' };
      expect(validateInput(input)).toEqual([
        { field: 'body', message: 'Body is required for notes' },
      ]);
    });
  });

  describe('link type', () => {
    test('returns empty array for valid link input', () => {
      const input: KnowledgeItemInput = {
        type: 'link',
        url: 'https://example.com',
      };
      expect(validateInput(input)).toEqual([]);
    });

    test('returns error for empty URL', () => {
      const input: KnowledgeItemInput = { type: 'link', url: '' };
      expect(validateInput(input)).toEqual([
        { field: 'url', message: 'URL is required for links' },
      ]);
    });

    test('returns empty array for any non-empty URL (no format validation)', () => {
      const input: KnowledgeItemInput = { type: 'link', url: 'not-a-url' };
      expect(validateInput(input)).toEqual([]);
    });

    test('accepts http URLs', () => {
      const input: KnowledgeItemInput = {
        type: 'link',
        url: 'http://example.com',
      };
      expect(validateInput(input)).toEqual([]);
    });

    test('accepts https URLs', () => {
      const input: KnowledgeItemInput = {
        type: 'link',
        url: 'https://example.com/path?query=1',
      };
      expect(validateInput(input)).toEqual([]);
    });
  });

  describe('highlight type', () => {
    test('returns empty array for valid highlight input', () => {
      const input: KnowledgeItemInput = {
        type: 'highlight',
        body: 'Highlighted text',
      };
      expect(validateInput(input)).toEqual([]);
    });

    test('returns error for empty body', () => {
      const input: KnowledgeItemInput = { type: 'highlight', body: '' };
      expect(validateInput(input)).toEqual([
        { field: 'text', message: 'Text is required for highlights' },
      ]);
    });
  });

  describe('screenshot type', () => {
    test('returns empty array for valid screenshot input', () => {
      const input: KnowledgeItemInput = {
        type: 'screenshot',
        body: 'Screenshot text',
      };
      expect(validateInput(input)).toEqual([]);
    });

    test('returns error for empty body', () => {
      const input: KnowledgeItemInput = { type: 'screenshot', body: '' };
      expect(validateInput(input)).toEqual([
        { field: 'imageData', message: 'Image data is required for screenshots' },
      ]);
    });
  });

  describe('share type', () => {
    test('returns empty array when body is provided', () => {
      const input: KnowledgeItemInput = {
        type: 'share',
        body: 'Shared text',
      };
      expect(validateInput(input)).toEqual([]);
    });

    test('returns empty array when URL is provided', () => {
      const input: KnowledgeItemInput = {
        type: 'share',
        url: 'https://example.com',
      };
      expect(validateInput(input)).toEqual([]);
    });

    test('returns empty array when both body and URL are provided', () => {
      const input: KnowledgeItemInput = {
        type: 'share',
        body: 'Shared text',
        url: 'https://example.com',
      };
      expect(validateInput(input)).toEqual([]);
    });

    test('returns error when neither body nor URL is provided', () => {
      const input: KnowledgeItemInput = { type: 'share' };
      expect(validateInput(input)).toEqual([
        { field: 'url', message: 'URL or body is required for shares' },
      ]);
    });

    test('returns empty array for any non-empty URL (no format validation)', () => {
      const input: KnowledgeItemInput = {
        type: 'share',
        url: 'not-a-url',
      };
      expect(validateInput(input)).toEqual([]);
    });
  });
});
