import { describe, expect, test } from 'bun:test';
import { validateInput } from './saveKnowledgeItem.validation';
import type { KnowledgeItemInput } from './saveKnowledgeItem.types';

describe('validateInput', () => {
  describe('note type', () => {
    test('returns null for valid note input', () => {
      const input: KnowledgeItemInput = { type: 'note', body: 'Valid body' };
      expect(validateInput(input)).toBeNull();
    });

    test('returns error for empty body', () => {
      const input: KnowledgeItemInput = { type: 'note', body: '' };
      const error = validateInput(input);
      expect(error).toBe('Note body is required and cannot be empty');
    });

    test('returns error for whitespace-only body', () => {
      const input: KnowledgeItemInput = { type: 'note', body: '   ' };
      const error = validateInput(input);
      expect(error).toBe('Note body is required and cannot be empty');
    });
  });

  describe('link type', () => {
    test('returns null for valid link input', () => {
      const input: KnowledgeItemInput = {
        type: 'link',
        url: 'https://example.com',
      };
      expect(validateInput(input)).toBeNull();
    });

    test('returns error for empty URL', () => {
      const input: KnowledgeItemInput = { type: 'link', url: '' };
      const error = validateInput(input);
      expect(error).toBe('Link URL is required and cannot be empty');
    });

    test('returns error for invalid URL format', () => {
      const input: KnowledgeItemInput = { type: 'link', url: 'not-a-url' };
      const error = validateInput(input);
      expect(error).toBe('Invalid URL format');
    });

    test('accepts http URLs', () => {
      const input: KnowledgeItemInput = {
        type: 'link',
        url: 'http://example.com',
      };
      expect(validateInput(input)).toBeNull();
    });

    test('accepts https URLs', () => {
      const input: KnowledgeItemInput = {
        type: 'link',
        url: 'https://example.com/path?query=1',
      };
      expect(validateInput(input)).toBeNull();
    });
  });

  describe('highlight type', () => {
    test('returns null for valid highlight input', () => {
      const input: KnowledgeItemInput = {
        type: 'highlight',
        body: 'Highlighted text',
      };
      expect(validateInput(input)).toBeNull();
    });

    test('returns error for empty body', () => {
      const input: KnowledgeItemInput = { type: 'highlight', body: '' };
      const error = validateInput(input);
      expect(error).toBe('Highlight text is required and cannot be empty');
    });
  });

  describe('screenshot type', () => {
    test('returns null for valid screenshot input', () => {
      const input: KnowledgeItemInput = {
        type: 'screenshot',
        body: 'Screenshot text',
      };
      expect(validateInput(input)).toBeNull();
    });

    test('returns error for empty body', () => {
      const input: KnowledgeItemInput = { type: 'screenshot', body: '' };
      const error = validateInput(input);
      expect(error).toBe('Screenshot text is required and cannot be empty');
    });
  });

  describe('share type', () => {
    test('returns null when body is provided', () => {
      const input: KnowledgeItemInput = {
        type: 'share',
        body: 'Shared text',
      };
      expect(validateInput(input)).toBeNull();
    });

    test('returns null when URL is provided', () => {
      const input: KnowledgeItemInput = {
        type: 'share',
        url: 'https://example.com',
      };
      expect(validateInput(input)).toBeNull();
    });

    test('returns null when both body and URL are provided', () => {
      const input: KnowledgeItemInput = {
        type: 'share',
        body: 'Shared text',
        url: 'https://example.com',
      };
      expect(validateInput(input)).toBeNull();
    });

    test('returns error when neither body nor URL is provided', () => {
      const input: KnowledgeItemInput = { type: 'share' };
      const error = validateInput(input);
      expect(error).toBe('Share content is required (body or URL)');
    });

    test('returns error for invalid URL format', () => {
      const input: KnowledgeItemInput = {
        type: 'share',
        url: 'not-a-url',
      };
      const error = validateInput(input);
      expect(error).toBe('Invalid URL format');
    });
  });
});
