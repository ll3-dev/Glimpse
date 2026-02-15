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
  setApiKey,
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
    const result = setApiKey('anthropic', '  sk-ant-12345678901234567890  ');
    expect(result.valid).toBe(true);
    expect(getApiKey()).toBe('sk-ant-12345678901234567890');
    expect(getProvider()).toBe('anthropic');
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
