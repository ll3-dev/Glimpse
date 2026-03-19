import { describe, expect, test } from 'bun:test';

import { aiProviderError, isAIProviderError } from './types';

describe('aiProviderError', () => {
  test('creates AIProviderError with required fields', () => {
    const error = aiProviderError(
      'AI_PROVIDER_UNAVAILABLE',
      'apple',
      'Provider unavailable'
    );

    expect(error._tag).toBe('AI_PROVIDER_ERROR');
    expect(error.code).toBe('AI_PROVIDER_UNAVAILABLE');
    expect(error.provider).toBe('apple');
    expect(error.message).toBe('Provider unavailable');
    expect(error.details).toBeDefined();
    expect(error.details?.provider).toBe('apple');
  });

  test('creates AIProviderError with optional cause', () => {
    const cause = new Error('Underlying error');
    const error = aiProviderError(
      'AI_PROVIDER_INTERNAL_ERROR',
      'local',
      'Generation failed',
      cause
    );

    expect(error.details?.cause).toBe(cause);
  });

  test('supports all error codes', () => {
    const codes = [
      'AI_PROVIDER_UNAVAILABLE',
      'AI_PROVIDER_TIMEOUT',
      'AI_PROVIDER_RATE_LIMITED',
      'AI_PROVIDER_INVALID_RESPONSE',
      'AI_PROVIDER_NETWORK_ERROR',
      'AI_PROVIDER_INTERNAL_ERROR',
    ] as const;

    codes.forEach((code) => {
      const error = aiProviderError(code, 'test', 'message');
      expect(error.code).toBe(code);
    });
  });
});

describe('isAIProviderError', () => {
  test('returns true for valid AIProviderError', () => {
    const error = aiProviderError('AI_PROVIDER_UNAVAILABLE', 'apple', 'test');
    expect(isAIProviderError(error)).toBe(true);
  });

  test('returns false for null', () => {
    expect(isAIProviderError(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isAIProviderError(undefined)).toBe(false);
  });

  test('returns false for non-object values', () => {
    expect(isAIProviderError('error')).toBe(false);
    expect(isAIProviderError(123)).toBe(false);
  });

  test('returns false for object without _tag', () => {
    expect(isAIProviderError({ code: 'test', message: 'test' })).toBe(false);
  });

  test('returns false for object with wrong _tag', () => {
    expect(
      isAIProviderError({ _tag: 'OTHER_ERROR', code: 'test', message: 'test' })
    ).toBe(false);
  });

  test('returns false for plain AppError', () => {
    expect(
      isAIProviderError({ _tag: 'VALIDATION_ERROR', code: 'VALIDATION_ERROR', message: 'test' })
    ).toBe(false);
  });
});
