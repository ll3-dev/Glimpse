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
import { logger } from '@/src/utils/logger';

function loadPersistedSettings(): BYOKConfig {
  const providerValue = storage.getString(StorageKeys.BYOK_PROVIDER) ?? null;
  const provider = isBYOKProvider(providerValue) ? providerValue : null;
  const baseUrl = storage.getString(StorageKeys.BYOK_BASE_URL) ?? null;
  const model = storage.getString(StorageKeys.BYOK_MODEL) ?? null;

  return {
    enabled: false,
    provider,
    apiKey: null,
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
  } catch (error) {
    // 복원 실패를 삼키지 않는다 — 진단 가능해야 하며 스토어는 초기 상태 유지
    logger.error('byok hydration failed', error);
  }
}

let hydrationPromise: Promise<void> | null = null;

/**
 * SecureStore 키 복원이 완료될 때까지 기다린다(실패해도 resolve —
 * 스토어는 초기 상태를 유지하고 소비자가 안내 경로로 처리한다).
 * 콜드스타트 직후 BYOK 실행이 키 null로 거부되는 레이스를 막는 게이트.
 */
export function ensureBYOKHydrated(): Promise<void> {
  hydrationPromise ??= hydrateBYOKSecureKey();
  return hydrationPromise;
}

// Automatically trigger secure hydration on store import
void ensureBYOKHydrated();

/** @internal 테스트 전용 — 메모이제이션 상태를 초기화해 재하이드레이션을 유발한다. */
export function __resetBYOKHydrationForTests(): void {
  hydrationPromise = null;
}

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

export async function setBYOKApiKey(apiKey: string | null): Promise<void> {
  if (apiKey) {
    await setSecureItem(SecureStorageKeys.BYOK_API_KEY, apiKey);
    // Plaintext is removed only after the encrypted write is confirmed.
    storage.remove(StorageKeys.BYOK_API_KEY);
  } else {
    await deleteSecureItem(SecureStorageKeys.BYOK_API_KEY);
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

export async function clearBYOKStoredSettings(): Promise<void> {
  await deleteSecureItem(SecureStorageKeys.BYOK_API_KEY);
  storage.remove(StorageKeys.BYOK_ENABLED);
  storage.remove(StorageKeys.BYOK_PROVIDER);
  storage.remove(StorageKeys.BYOK_API_KEY);
  storage.remove(StorageKeys.BYOK_BASE_URL);
  storage.remove(StorageKeys.BYOK_MODEL);
  resetBYOKStoreConfig();
}

export type { BYOKConfig, BYOKProviderType, BYOKStoreActions, BYOKStoreState };
