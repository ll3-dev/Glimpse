/**
 * Local Core Store
 * Migrated from @glimpse/core/adapters/local
 */

import type { KeyValueStorage } from '@glimpse/shared';
import { storage } from '@/src/lib/storage';

// Storage keys for core settings
const CORE_STORE_KEYS = {
  INFERENCE_MODE: 'core:inferenceMode',
  BYOK_CONFIG: 'core:byokConfig',
  APPLE_INTELLIGENCE_CONFIG: 'core:appleIntelligenceConfig',
  LOCAL_LLM_CONFIG: 'core:localLLMConfig',
} as const;

const localCoreStorage: KeyValueStorage = {
  getString: (key) => storage.getString(key),
  set: (key, value) => storage.set(key, value),
  remove: (key) => storage.remove(key),
};

interface CoreStore {
  inferenceMode: string | null;
  byokConfig: string | null;
  appleIntelligenceConfig: string | null;
  localLLMConfig: string | null;
}

function createLocalCoreStore(storage: KeyValueStorage) {
  const readCoreStore = (): CoreStore => ({
    inferenceMode: storage.getString(CORE_STORE_KEYS.INFERENCE_MODE) ?? null,
    byokConfig: storage.getString(CORE_STORE_KEYS.BYOK_CONFIG) ?? null,
    appleIntelligenceConfig: storage.getString(CORE_STORE_KEYS.APPLE_INTELLIGENCE_CONFIG) ?? null,
    localLLMConfig: storage.getString(CORE_STORE_KEYS.LOCAL_LLM_CONFIG) ?? null,
  });

  const writeCoreStore = (store: Partial<CoreStore>): void => {
    if (store.inferenceMode !== undefined) {
      if (store.inferenceMode === null) {
        storage.remove(CORE_STORE_KEYS.INFERENCE_MODE);
      } else {
        storage.set(CORE_STORE_KEYS.INFERENCE_MODE, store.inferenceMode);
      }
    }
    if (store.byokConfig !== undefined) {
      if (store.byokConfig === null) {
        storage.remove(CORE_STORE_KEYS.BYOK_CONFIG);
      } else {
        storage.set(CORE_STORE_KEYS.BYOK_CONFIG, store.byokConfig);
      }
    }
    if (store.appleIntelligenceConfig !== undefined) {
      if (store.appleIntelligenceConfig === null) {
        storage.remove(CORE_STORE_KEYS.APPLE_INTELLIGENCE_CONFIG);
      } else {
        storage.set(CORE_STORE_KEYS.APPLE_INTELLIGENCE_CONFIG, store.appleIntelligenceConfig);
      }
    }
    if (store.localLLMConfig !== undefined) {
      if (store.localLLMConfig === null) {
        storage.remove(CORE_STORE_KEYS.LOCAL_LLM_CONFIG);
      } else {
        storage.set(CORE_STORE_KEYS.LOCAL_LLM_CONFIG, store.localLLMConfig);
      }
    }
  };

  const updateCoreStore = (updater: (store: CoreStore) => Partial<CoreStore>): void => {
    const current = readCoreStore();
    const updates = updater(current);
    writeCoreStore(updates);
  };

  const resetCoreStoreForTests = (): void => {
    storage.remove(CORE_STORE_KEYS.INFERENCE_MODE);
    storage.remove(CORE_STORE_KEYS.BYOK_CONFIG);
    storage.remove(CORE_STORE_KEYS.APPLE_INTELLIGENCE_CONFIG);
    storage.remove(CORE_STORE_KEYS.LOCAL_LLM_CONFIG);
  };

  const __localCoreStoreTestUtils = {
    getStorage: () => localCoreStorage,
    getKeys: () => CORE_STORE_KEYS,
  };

  return {
    readCoreStore,
    writeCoreStore,
    updateCoreStore,
    resetCoreStoreForTests,
    __localCoreStoreTestUtils,
  };
}

export const {
  readCoreStore,
  writeCoreStore,
  updateCoreStore,
  resetCoreStoreForTests,
  __localCoreStoreTestUtils,
} = createLocalCoreStore(localCoreStorage);
