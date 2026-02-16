import { describe, expect, test } from 'bun:test';
import { maskApiKey, validateApiKey } from './byok.validation';
import type { BYOKProviderType } from './byok.types';

describe('maskApiKey', () => {
  test('returns empty string for null input', () => {
    expect(maskApiKey(null)).toBe('');
  });

  test('returns masked value for short keys (<=8 chars)', () => {
    expect(maskApiKey('short')).toBe('****');
    expect(maskApiKey('12345678')).toBe('****');
  });

  test('masks middle of key while showing first and last 4 chars', () => {
    const key = 'sk-1234567890abcdef';
    const masked = maskApiKey(key);
    expect(masked.startsWith('sk-1')).toBe(true);
    expect(masked.endsWith('cdef')).toBe(true);
    expect(masked).toContain('*');
  });

  test('limits masked portion to 20 chars', () => {
    const longKey = 'sk-1234567890123456789012345678901234567890';
    const masked = maskApiKey(longKey);
    const starCount = masked.split('').filter((c) => c === '*').length;
    expect(starCount).toBeLessThanOrEqual(20);
  });

  test('handles empty string', () => {
    expect(maskApiKey('')).toBe('');
  });
});

describe('validateApiKey', () => {
  describe('openai provider', () => {
    const provider: BYOKProviderType = 'openai';

    test('returns valid for correct format', () => {
      const result = validateApiKey('sk-proj-1234567890abcdef1234', provider);
      expect(result.valid).toBe(true);
    });

    test('returns error for empty key', () => {
      const result = validateApiKey('', provider);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API 키를 입력해주세요');
    });

    test('returns error for wrong prefix', () => {
      const result = validateApiKey('invalid-key-1234567890', provider);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('sk-');
    });

    test('returns error for too short key', () => {
      const result = validateApiKey('sk-short', provider);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API 키가 너무 짧습니다');
    });
  });

  describe('anthropic provider', () => {
    const provider: BYOKProviderType = 'anthropic';

    test('returns valid for correct format', () => {
      const result = validateApiKey('sk-ant-api12345678901234567', provider);
      expect(result.valid).toBe(true);
    });

    test('returns error for wrong prefix', () => {
      const result = validateApiKey('sk-proj-wrong-prefix-123456', provider);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('sk-ant-');
    });
  });

  describe('google provider', () => {
    const provider: BYOKProviderType = 'google';

    test('returns valid for correct format', () => {
      const result = validateApiKey('AIzaSy1234567890123456789', provider);
      expect(result.valid).toBe(true);
    });

    test('returns error for wrong prefix', () => {
      const result = validateApiKey('sk-wrong-google-key-12345', provider);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('AI');
    });
  });

  describe('whitespace handling', () => {
    test('returns error for whitespace-only key', () => {
      const result = validateApiKey('   ', 'openai');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API 키를 입력해주세요');
    });
  });
});
