import {
  BYOK_PROVIDERS,
  createBYOKSnapshot,
  isBYOKProvider,
  resetBYOKSnapshot,
  updateBYOKConfigSnapshot,
  type BYOKConfig,
  type BYOKProviderType,
  type BYOKStoreActions,
  type BYOKStoreState,
} from '@/src/features/core/application/state';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { storage, StorageKeys } from '@/src/lib/storage';

function loadPersistedSettings(): BYOKConfig {
  const enabled = storage.getBoolean(StorageKeys.BYOK_ENABLED) ?? false;
  const providerValue = storage.getString(StorageKeys.BYOK_PROVIDER) ?? null;
  const provider = isBYOKProvider(providerValue) ? providerValue : null;
  const apiKey = storage.getString(StorageKeys.BYOK_API_KEY) ?? null;
  const baseUrl = storage.getString(StorageKeys.BYOK_BASE_URL) ?? null;
  const model = storage.getString(StorageKeys.BYOK_MODEL) ?? null;

  return {
    enabled: provider !== null && apiKey !== null ? enabled : false,
    provider,
    apiKey,
    baseUrl,
    model,
  };
}

const byokStore = createStore<BYOKStoreState>((set) => ({
  config: createBYOKSnapshot(loadPersistedSettings()),
  actions: {
    updateConfig: (updater) => {
      set((state) => updateBYOKConfigSnapshot(state, updater));
    },
    resetConfig: () => {
      set((state) => ({ ...state, config: resetBYOKSnapshot() }));
    },
  },
}));

export function getBYOKStoreConfig(): BYOKConfig {
  return byokStore.getState().config;
}

export function useBYOKStoreConfig<T>(selector: (config: BYOKConfig) => T): T {
  return useStore(byokStore, (state) => selector(state.config));
}

export function updateBYOKStoreConfig(updater: (config: BYOKConfig) => BYOKConfig): void {
  byokStore.getState().actions.updateConfig(updater);
}

export function resetBYOKStoreConfig(): void {
  byokStore.getState().actions.resetConfig();
}

export function setBYOKEnabled(enabled: boolean): void {
  storage.set(StorageKeys.BYOK_ENABLED, enabled);
  updateBYOKStoreConfig((config) => ({ ...config, enabled }));
}

export function setBYOKProvider(provider: BYOKProviderType | null): void {
  if (provider) {
    storage.set(StorageKeys.BYOK_PROVIDER, provider);
  } else {
    storage.remove(StorageKeys.BYOK_PROVIDER);
  }
  updateBYOKStoreConfig((config) => ({ ...config, provider }));
}

export function setBYOKApiKey(apiKey: string | null): void {
  if (apiKey) {
    storage.set(StorageKeys.BYOK_API_KEY, apiKey);
  } else {
    storage.remove(StorageKeys.BYOK_API_KEY);
  }
  updateBYOKStoreConfig((config) => ({ ...config, apiKey }));
}

export function setBYOKBaseUrl(baseUrl: string | null): void {
  if (baseUrl) {
    storage.set(StorageKeys.BYOK_BASE_URL, baseUrl);
  } else {
    storage.remove(StorageKeys.BYOK_BASE_URL);
  }
  updateBYOKStoreConfig((config) => ({ ...config, baseUrl }));
}

export function setBYOKModel(model: string | null): void {
  if (model) {
    storage.set(StorageKeys.BYOK_MODEL, model);
  } else {
    storage.remove(StorageKeys.BYOK_MODEL);
  }
  updateBYOKStoreConfig((config) => ({ ...config, model }));
}

export function clearBYOKStoredSettings(): void {
  storage.remove(StorageKeys.BYOK_ENABLED);
  storage.remove(StorageKeys.BYOK_PROVIDER);
  storage.remove(StorageKeys.BYOK_API_KEY);
  storage.remove(StorageKeys.BYOK_BASE_URL);
  storage.remove(StorageKeys.BYOK_MODEL);
  resetBYOKStoreConfig();
}

export const BYOKProvider = BYOK_PROVIDERS;
export type { BYOKConfig, BYOKProviderType, BYOKStoreActions, BYOKStoreState };
