import { createLocalCoreStore } from '@glimpse/core/adapters/local';
import type { KeyValueStorage } from '@glimpse/core/ports';
import { storage } from '@/src/lib/storage';

const localCoreStorage: KeyValueStorage = {
  getString: (key) => storage.getString(key),
  set: (key, value) => storage.set(key, value),
  remove: (key) => storage.remove(key),
};

export const {
  readCoreStore,
  writeCoreStore,
  updateCoreStore,
  resetCoreStoreForTests,
  __localCoreStoreTestUtils,
} = createLocalCoreStore(localCoreStorage);
