import {
  getBYOKStoreConfig,
  useBYOKStoreConfig,
  type BYOKConfig,
  type BYOKProviderType,
} from '@/src/stores/settings/byok.store';

export function getBYOKConfig(): BYOKConfig {
  return { ...getBYOKStoreConfig() };
}

export function useBYOKConfig<T>(selector: (config: BYOKConfig) => T): T {
  return useBYOKStoreConfig(selector);
}

export function useBYOKReady(): boolean {
  return useBYOKStoreConfig(
    (config) => config.enabled && config.apiKey !== null && config.provider !== null
  );
}

export function useBYOKCredentialsConfigured(): boolean {
  return useBYOKStoreConfig(
    (config) => config.apiKey !== null && config.provider !== null
  );
}

export function isBYOKReady(): boolean {
  const config = getBYOKStoreConfig();
  return config.enabled && config.apiKey !== null && config.provider !== null;
}

export function hasBYOKCredentials(): boolean {
  const config = getBYOKStoreConfig();
  return config.apiKey !== null && config.provider !== null;
}

export function getApiKey(): string | null {
  return getBYOKStoreConfig().apiKey;
}

export function getProvider(): BYOKProviderType | null {
  return getBYOKStoreConfig().provider;
}

export function getBaseUrl(): string | null {
  return getBYOKStoreConfig().baseUrl;
}

export function getModel(): string | null {
  return getBYOKStoreConfig().model;
}
