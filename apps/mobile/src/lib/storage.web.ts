import {
  StorageKeys,
  type KeyValueStorage,
  type StorageValue,
} from './storage.shared';

const STORAGE_PREFIX = 'glimpse-settings:';
const serverValues = new Map<string, StorageValue>();

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function serialize(value: StorageValue): string {
  if (value instanceof ArrayBuffer) {
    return JSON.stringify({ type: 'array-buffer', value: Array.from(new Uint8Array(value)) });
  }
  return JSON.stringify({ type: typeof value, value });
}

function deserialize(raw: string | null): StorageValue | undefined {
  if (raw === null) return undefined;

  try {
    const parsed = JSON.parse(raw) as { type?: string; value?: unknown };
    if (parsed.type === 'array-buffer' && Array.isArray(parsed.value)) {
      return Uint8Array.from(parsed.value as number[]).buffer;
    }
    if (
      (parsed.type === 'string' && typeof parsed.value === 'string') ||
      (parsed.type === 'number' && typeof parsed.value === 'number') ||
      (parsed.type === 'boolean' && typeof parsed.value === 'boolean')
    ) {
      return parsed.value;
    }
  } catch {
    // Ignore malformed legacy values instead of breaking app startup.
  }

  return undefined;
}

function readValue(key: string): StorageValue | undefined {
  const browserStorage = getBrowserStorage();
  if (!browserStorage) return serverValues.get(key);
  return deserialize(browserStorage.getItem(`${STORAGE_PREFIX}${key}`));
}

export const storage: KeyValueStorage = {
  set(key, value) {
    const browserStorage = getBrowserStorage();
    if (!browserStorage) {
      serverValues.set(key, value);
      return;
    }
    browserStorage.setItem(`${STORAGE_PREFIX}${key}`, serialize(value));
  },
  getBoolean(key) {
    const value = readValue(key);
    return typeof value === 'boolean' ? value : undefined;
  },
  getString(key) {
    const value = readValue(key);
    return typeof value === 'string' ? value : undefined;
  },
  getNumber(key) {
    const value = readValue(key);
    return typeof value === 'number' ? value : undefined;
  },
  contains(key) {
    const browserStorage = getBrowserStorage();
    return browserStorage
      ? browserStorage.getItem(`${STORAGE_PREFIX}${key}`) !== null
      : serverValues.has(key);
  },
  remove(key) {
    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      const existed = browserStorage.getItem(`${STORAGE_PREFIX}${key}`) !== null;
      browserStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      return existed;
    }
    return serverValues.delete(key);
  },
  getAllKeys() {
    const browserStorage = getBrowserStorage();
    if (!browserStorage) return Array.from(serverValues.keys());

    const keys: string[] = [];
    for (let index = 0; index < browserStorage.length; index += 1) {
      const key = browserStorage.key(index);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keys.push(key.slice(STORAGE_PREFIX.length));
      }
    }
    return keys;
  },
  clearAll() {
    const browserStorage = getBrowserStorage();
    if (!browserStorage) {
      serverValues.clear();
      return;
    }
    for (const key of storage.getAllKeys()) {
      browserStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    }
  },
};

export { StorageKeys };
export type { KeyValueStorage, StorageKey, StorageValue } from './storage.shared';
