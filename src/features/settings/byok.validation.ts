import type { BYOKProviderType, ValidationResult } from './byok.types';

const KEY_PREFIXES: Record<BYOKProviderType, string> = {
  openai: 'sk-',
  anthropic: 'sk-ant-',
  google: 'AI',
};

export function maskApiKey(key: string | null): string {
  if (!key) {
    return '';
  }

  if (key.length <= 8) {
    return '****';
  }

  const start = key.substring(0, 4);
  const end = key.substring(key.length - 4);
  const masked = '*'.repeat(Math.min(key.length - 8, 20));

  return `${start}${masked}${end}`;
}

export function validateApiKey(key: string, provider: BYOKProviderType): ValidationResult {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: 'API 키를 입력해주세요' };
  }

  const prefix = KEY_PREFIXES[provider];
  if (!key.startsWith(prefix)) {
    return {
      valid: false,
      error: `올바른 ${provider} API 키 형식이 아닙니다 (${prefix}로 시작해야 함)`,
    };
  }

  if (key.length < 20) {
    return { valid: false, error: 'API 키가 너무 짧습니다' };
  }

  return { valid: true };
}
