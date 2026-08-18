import {
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
import {
  SecureStorageKeys,
  getSecureItem,
  setSecureItem,
  deleteSecureItem,
  migrateLegacyPlaintextKey,
} from '@/src/lib/secure-storage';

function loadPersistedSettings(): BYOKConfig {
  const enabled = storage.getBoolean(StorageKeys.BYOK_ENABLED) ?? false;
  const providerValue = storage.getString(StorageKeys.BYOK_PROVIDER) ?? null;
  const provider = isBYOKProvider(providerValue) ? providerValue : null;
  // Check for any legacy unencrypted MMKV key (will be migrated asynchronously)
  const legacyApiKey = storage.getString(StorageKeys.BYOK_API_KEY) ?? null;
  const baseUrl = storage.getString(StorageKeys.BYOK_BASE_URL) ?? null;
  const model = storage.getString(StorageKeys.BYOK_MODEL) ?? null;

  return {
    enabled: provider !== null && legacyApiKey !== null ? enabled : false,
    provider,
    apiKey: legacyApiKey,
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

/**
 * Hydrate encrypted API key from Keychain / Keystore and clean up legacy storage
 */
export async function hydrateBYOKSecureKey(): Promise<void> {
  try {
    const key = await migrateLegacyPlaintextKey(
      StorageKeys.BYOK_API_KEY,
      SecureStorageKeys.BYOK_API_KEY
    ) ?? await getSecureItem(SecureStorageKeys.BYOK_API_KEY);

    if (key) {
      updateBYOKStoreConfig((config) => ({
        ...config,
        apiKey: key,
        enabled: config.provider !== null ? (storage.getBoolean(StorageKeys.BYOK_ENABLED) ?? true) : false,
      }));
    }
  } catch {
    // Ignore hydration error silently
  }
}

// Automatically trigger secure hydration on store import
void hydrateBYOKSecureKey();

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
    void setSecureItem(SecureStorageKeys.BYOK_API_KEY, apiKey);
    // Remove legacy unencrypted key from MMKV if present
    storage.remove(StorageKeys.BYOK_API_KEY);
  } else {
    void deleteSecureItem(SecureStorageKeys.BYOK_API_KEY);
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
  void deleteSecureItem(SecureStorageKeys.BYOK_API_KEY);
  resetBYOKStoreConfig();
}

export type { BYOKConfig, BYOKProviderType, BYOKStoreActions, BYOKStoreState };
