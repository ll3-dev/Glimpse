import { getBYOKStoreConfig, resetBYOKStoreConfig, updateBYOKStoreConfig, type BYOKProviderType } from '@/src/stores/settings/byok.store';
import { validateApiKey } from './byok.validation';
import type { ValidationResult } from './byok.types';

export function enableBYOK(): ValidationResult {
  const config = getBYOKStoreConfig();

  if (!config.apiKey) {
    return { valid: false, error: 'API 키를 먼저 설정해주세요' };
  }

  if (!config.provider) {
    return { valid: false, error: 'Provider를 선택해주세요' };
  }

  updateBYOKStoreConfig((previous) => ({ ...previous, enabled: true }));
  return { valid: true };
}

export function disableBYOK(): void {
  updateBYOKStoreConfig((previous) => ({ ...previous, enabled: false }));
}

export function setProvider(provider: BYOKProviderType | null): void {
  updateBYOKStoreConfig((previous) => ({ ...previous, provider }));
}

export function setApiKey(provider: BYOKProviderType, apiKey: string): ValidationResult {
  const trimmedKey = apiKey.trim();
  const validation = validateApiKey(trimmedKey, provider);
  if (!validation.valid) {
    return validation;
  }

  updateBYOKStoreConfig((previous) => ({
    ...previous,
    provider,
    apiKey: trimmedKey,
  }));

  return { valid: true };
}

export function clearApiKey(): void {
  resetBYOKStoreConfig();
}
