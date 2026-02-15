/**
 * BYOK (Bring Your Own Key) Settings
 *
 * Manages user-provided API keys for LLM providers.
 * This is a stub implementation - keys are stored in memory for now.
 * Future: Migrate to secure storage (Keychain/EncryptedStorage).
 */

/**
 * Supported LLM providers for BYOK
 */
export const BYOKProvider = ['openai', 'anthropic', 'google'] as const;
export type BYOKProviderType = (typeof BYOKProvider)[number];

/**
 * BYOK configuration
 */
export interface BYOKConfig {
  enabled: boolean;
  provider: BYOKProviderType | null;
  apiKey: string | null;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// In-memory storage (stub - replace with secure storage later)
let byokConfig: BYOKConfig = {
  enabled: false,
  provider: null,
  apiKey: null,
};

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
  return { ...byokConfig };
}

/**
 * Checks if BYOK is enabled and has a valid key.
 *
 * @returns true if BYOK is ready to use
 */
export function isBYOKReady(): boolean {
  return byokConfig.enabled && byokConfig.apiKey !== null && byokConfig.provider !== null;
}

/**
 * Enables BYOK with validation.
 *
 * @returns Validation result (fails if no key is set)
 */
export function enableBYOK(): ValidationResult {
  if (!byokConfig.apiKey) {
    return { valid: false, error: 'API 키를 먼저 설정해주세요' };
  }
  if (!byokConfig.provider) {
    return { valid: false, error: 'Provider를 선택해주세요' };
  }

  byokConfig = { ...byokConfig, enabled: true };
  return { valid: true };
}

/**
 * Disables BYOK.
 */
export function disableBYOK(): void {
  byokConfig = { ...byokConfig, enabled: false };
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

  byokConfig = {
    ...byokConfig,
    provider,
    apiKey: trimmedKey,
  };

  return { valid: true };
}

/**
 * Clears the stored API key.
 */
export function clearApiKey(): void {
  byokConfig = {
    enabled: false,
    provider: null,
    apiKey: null,
  };
}

/**
 * Gets the API key for use in API calls.
 * Use with caution - returns the actual key.
 *
 * @returns API key or null if not set
 */
export function getApiKey(): string | null {
  return byokConfig.apiKey;
}

/**
 * Gets the current provider.
 *
 * @returns Provider type or null
 */
export function getProvider(): BYOKProviderType | null {
  return byokConfig.provider;
}
