/**
 * BYOK (Bring Your Own Key) Settings
 *
 * Manages user-provided API keys for LLM providers.
 * This is a stub implementation - keys are stored in memory for now.
 * Future: Migrate to secure storage (Keychain/EncryptedStorage).
 */
import {
  BYOKProvider,
  type BYOKProviderType,
  type BYOKConfig,
  getBYOKStoreConfig,
  useBYOKStoreConfig,
  updateBYOKStoreConfig,
  resetBYOKStoreConfig,
} from '@/src/stores/settings/byok.store';

export { BYOKProvider };
export type { BYOKProviderType, BYOKConfig };

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * API key prefix patterns for validation
 */
const KEY_PREFIXES: Record<BYOKProviderType, string> = {
  openai: 'sk-',
  anthropic: 'sk-ant-',
  google: 'AI', // Google API keys start with 'AI'
};

/**
 * Masks an API key for display.
 * Shows first 4 and last 4 characters, masks the rest.
 *
 * @param key - API key to mask
 * @returns Masked key string
 */
export function maskApiKey(key: string | null): string {
  if (!key) return '';
  if (key.length <= 8) return '****';

  const start = key.substring(0, 4);
  const end = key.substring(key.length - 4);
  const masked = '*'.repeat(Math.min(key.length - 8, 20));

  return `${start}${masked}${end}`;
}

/**
 * Validates an API key format.
 *
 * @param key - API key to validate
 * @param provider - Provider type
 * @returns Validation result
 */
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

/**
 * Gets the current BYOK configuration.
 *
 * @returns Current BYOK config
 */
export function getBYOKConfig(): BYOKConfig {
  return { ...getBYOKStoreConfig() };
}

/**
 * React hook for selecting BYOK configuration from the shared store.
 *
 * @param selector - Selector over BYOK config
 * @returns Selected value
 */
export function useBYOKConfig<T>(selector: (config: BYOKConfig) => T): T {
  return useBYOKStoreConfig(selector);
}

export function useBYOKReady(): boolean {
  return useBYOKStoreConfig(
    (config) => config.enabled && config.apiKey !== null && config.provider !== null,
  );
}

export function useBYOKCredentialsConfigured(): boolean {
  return useBYOKStoreConfig(
    (config) => config.apiKey !== null && config.provider !== null,
  );
}

/**
 * Checks if BYOK is enabled and has a valid key.
 *
 * @returns true if BYOK is ready to use
 */
export function isBYOKReady(): boolean {
  const config = getBYOKStoreConfig();
  return config.enabled && config.apiKey !== null && config.provider !== null;
}

/**
 * Checks if BYOK credentials are configured (regardless of enabled state).
 *
 * @returns true if provider and key are present
 */
export function hasBYOKCredentials(): boolean {
  const config = getBYOKStoreConfig();
  return config.apiKey !== null && config.provider !== null;
}

/**
 * Enables BYOK with validation.
 *
 * @returns Validation result (fails if no key is set)
 */
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

/**
 * Disables BYOK.
 */
export function disableBYOK(): void {
  updateBYOKStoreConfig((previous) => ({ ...previous, enabled: false }));
}

/**
 * Sets only the selected provider.
 *
 * @param provider - Selected LLM provider
 */
export function setProvider(provider: BYOKProviderType | null): void {
  updateBYOKStoreConfig((previous) => ({ ...previous, provider }));
}

/**
 * Sets the API key for a provider.
 *
 * @param provider - LLM provider
 * @param apiKey - API key
 * @returns Validation result
 */
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

/**
 * Clears the stored API key.
 */
export function clearApiKey(): void {
  resetBYOKStoreConfig();
}

/**
 * Gets the API key for use in API calls.
 * Use with caution - returns the actual key.
 *
 * @returns API key or null if not set
 */
export function getApiKey(): string | null {
  return getBYOKStoreConfig().apiKey;
}

/**
 * Gets the current provider.
 *
 * @returns Provider type or null
 */
export function getProvider(): BYOKProviderType | null {
  return getBYOKStoreConfig().provider;
}
