import { afterEach, mock } from 'bun:test';
import { randomUUID as nodeRandomUUID } from "node:crypto";

type LocalStorageLike = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem' | 'clear' | 'key' | 'length'
>;

const globalWithDev = globalThis as typeof globalThis & {
  __DEV__?: boolean;
  localStorage?: LocalStorageLike;
};

if (typeof globalWithDev.__DEV__ === 'undefined') {
  globalWithDev.__DEV__ = false;
}

mock.module("expo-crypto", () => ({
  randomUUID: nodeRandomUUID,
}));

// Mock react-native to avoid runtime errors in test environment
mock.module("react-native", () => ({
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
  NativeModules: {},
  NativeEventEmitter: class NativeEventEmitter {
    addListener() { return { remove: () => {} }; }
    removeListener() {}
    removeAllListeners() {}
  },
  TurboModuleRegistry: {
    getEnforcing: () => ({}),
  },
}));

// Mock react-native-nitro-modules for tests
const nitroStorage = new Map<string, unknown>();

mock.module("react-native-nitro-modules", () => ({
  NitroModules: {
    createHybridObject: () => null,
  },
  HybridObject: class {},
}));

// Mock react-native-mmkv for tests
mock.module("react-native-mmkv", () => ({
  createMMKV: () => ({
    id: 'test-storage',
    size: 0,
    isReadOnly: false,
    set: (key: string, value: unknown) => { nitroStorage.set(key, value); },
    getBoolean: (key: string) => nitroStorage.get(key) as boolean | undefined,
    getString: (key: string) => nitroStorage.get(key) as string | undefined,
    getNumber: (key: string) => nitroStorage.get(key) as number | undefined,
    getBuffer: () => undefined,
    contains: (key: string) => nitroStorage.has(key),
    remove: (key: string) => { nitroStorage.delete(key); return true; },
    getAllKeys: () => Array.from(nitroStorage.keys()),
    clearAll: () => nitroStorage.clear(),
    recrypt: () => {},
    trim: () => {},
    addOnValueChangedListener: () => ({ remove: () => {} }),
    importAllFrom: () => 0,
  }),
}));

// Mock llama.rn for tests - provides stub implementation
mock.module("llama.rn", () => ({
  initLlama: mock(async () => ({
    completion: mock(async () => ({
      text: 'Generated text',
      tokens_evaluated: 10,
    })),
    release: mock(async () => {}),
  })),
}));

if (typeof globalWithDev.localStorage === 'undefined') {
  const storage = new Map<string, string>();
  globalWithDev.localStorage = {
    get length() {
      return storage.size;
    },
    key: (index) => Array.from(storage.keys())[index] ?? null,
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
