import { afterEach, mock } from 'bun:test';

const globalWithDev = globalThis as typeof globalThis & {
  __DEV__?: boolean;
  localStorage?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
  };
};

if (typeof globalWithDev.__DEV__ === 'undefined') {
  globalWithDev.__DEV__ = false;
}

if (typeof globalWithDev.localStorage === 'undefined') {
  const storage = new Map<string, string>();
  globalWithDev.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
    removeItem: (key) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  };
}

const originalDateNow = Date.now;
const originalMathRandom = Math.random;

afterEach(() => {
  Date.now = originalDateNow;
  Math.random = originalMathRandom;
  globalWithDev.localStorage?.clear();
  mock.clearAllMocks();
});
