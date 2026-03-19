import { beforeEach, describe, expect, test } from 'bun:test';
import {
  clearApiKey,
  disableBYOK,
  enableBYOK,
  getApiKey,
  getBYOKConfig,
  getProvider,
  isBYOKReady,
  maskApiKey,
  setBaseUrl,
  setModel,
  setApiKey,
  setProvider,
  validateApiKey,
} from './byokSettings';

describe('byokSettings', () => {
  beforeEach(() => {
    clearApiKey();
    disableBYOK();
  });

  test('validateApiKey rejects empty key', () => {
    expect(validateApiKey('', 'openai')).toEqual({
      valid: false,
      error: 'API 키를 입력해주세요',
    });
  });

  test('validateApiKey checks prefix and min length', () => {
    expect(validateApiKey('invalid-key', 'openai').valid).toBe(false);
    expect(validateApiKey('sk-short', 'openai').valid).toBe(false);
    expect(validateApiKey('sk-12345678901234567890', 'openai').valid).toBe(true);
  });

  test('setApiKey persists trimmed key and provider', () => {
    setProvider('anthropic');
    const result = setApiKey('anthropic', '  sk-ant-12345678901234567890  ');
    expect(result.valid).toBe(true);
    expect(getApiKey()).toBe('sk-ant-12345678901234567890');
    expect(getProvider()).toBe('anthropic');
  });

  test('supports storing base URL and model', () => {
    setProvider('openai');
    expect(setBaseUrl(' https://example.com/v1/ ')).toEqual({ valid: true });
    expect(setModel('gpt-4.1-mini')).toEqual({ valid: true });

    const config = getBYOKConfig();
    expect(config.baseUrl).toBe('https://example.com/v1');
    expect(config.model).toBe('gpt-4.1-mini');
  });

  test('allows preview model ids', () => {
    setProvider('google');
    expect(setModel('gemini-3-flash-preview')).toEqual({ valid: true });
    expect(getBYOKConfig().model).toBe('gemini-3-flash-preview');
  });

  test('changing provider clears existing key', () => {
    setProvider('openai');
    setApiKey('openai', 'sk-12345678901234567890');
    expect(getApiKey()).toBe('sk-12345678901234567890');

    setProvider('anthropic');
    expect(getApiKey()).toBeNull();
  });

  test('enableBYOK fails when key/provider are missing', () => {
    expect(enableBYOK().valid).toBe(false);
    expect(isBYOKReady()).toBe(false);
  });

  test('enableBYOK succeeds after valid key setup', () => {
    setApiKey('openai', 'sk-12345678901234567890');
    expect(enableBYOK()).toEqual({ valid: true });
    expect(isBYOKReady()).toBe(true);
    expect(getBYOKConfig().enabled).toBe(true);
  });

  test('maskApiKey masks middle section', () => {
    expect(maskApiKey('')).toBe('');
    expect(maskApiKey('12345678')).toBe('****');
    expect(maskApiKey('sk-1234567890abcdef')).toBe('sk-1***********cdef');
  });
});
