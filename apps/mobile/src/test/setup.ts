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

mock.module("react-native-nitro-crypto", () => ({
  randomUUID: nodeRandomUUID,
}));

// Mock native-core-client to avoid "not available on web platform" errors in tests
// The .ts (web fallback) variant throws immediately at import time
mock.module("../features/core/native-core-client", () => {
  const noop = async () => {};
  const noopReturn = async () => null;
  const noopArray = async () => [];
  return {
    nativeCoreClient: {
      initialize: noop,
      saveKnowledgeItem: noopReturn,
      getKnowledgeItemById: noopReturn,
      updateKnowledgeItem: noopReturn,
      listKnowledgeItems: noopArray,
      listKnowledgeItemsByIds: noopArray,
      deleteKnowledgeItem: noop,
      searchKnowledgeItems: noopArray,
      calculateTagOverlap: async () => 0,
      getDueKnowledgeItems: noopArray,
      initializeReviewSchedule: noopReturn,
      listWeeklyKnowledgeItems: noopArray,
      listPendingRecommendations: noopArray,
      listRecommendations: noopArray,
      saveRecommendations: noop,
      respondToRecommendation: noop,
      logRecommendationFeedback: noopReturn,
      listRecentFeedbackEvents: noopArray,
      listPendingKnowledgeItemsForLabeling: noopArray,
      syncKnowledgeItems: noopArray,
    },
  };
});

// Mock react-native to avoid runtime errors in test environment
mock.module("react-native", () => ({
  Platform: {
    OS: 'ios',
    Version: '17.0',
    select: (options: Record<string, unknown>) => options.ios,
    constants: {},
  },
  AppState: {
    addEventListener: () => ({ remove: () => {} }),
  },
  // uniwind(config.native)가 모듈 로드 시 require — 테마 스토어 테스트에 필요
  Appearance: {
    getColorScheme: () => 'light',
    addChangeListener: () => ({ remove: () => {} }),
    setColorScheme: () => null,
  },
  Insets: { mode: 'padding', top: 0, bottom: 0, left: 0, right: 0 },
  NativeModules: {},
  NativeEventEmitter: class NativeEventEmitter {
    addListener() { return { remove: () => {} }; }
    removeListener() {}
    removeAllListeners() {}
  },
  TurboModuleRegistry: {
    getEnforcing: () => ({}),
  },
  // 기본 호스트 컴포넌트 — UI 프리미티브 렌더 테스트(react-dom/server)에서 사용.
  // 문자열 더미로 두면 react-dom/server가 HTML 태그로 렌더한다.
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
}));

const nitroStorage = new Map<string, unknown>();

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

const secureStorageMap = new Map<string, string>();

// Mock expo-secure-store for tests
mock.module("expo-secure-store", () => ({
  getItemAsync: mock(async (key: string) => secureStorageMap.get(key) ?? null),
  setItemAsync: mock(async (key: string, value: string) => {
    secureStorageMap.set(key, value);
  }),
  deleteItemAsync: mock(async (key: string) => {
    secureStorageMap.delete(key);
  }),
  isAvailableAsync: mock(async () => true),
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  ALWAYS: 'ALWAYS',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
  ALWAYS_THIS_DEVICE_ONLY: 'ALWAYS_THIS_DEVICE_ONLY',
}));

mock.module("expo-task-manager", () => {
  const definedTasks = new Map<string, unknown>();
  const registeredTasks = new Set<string>();

  return {
    defineTask: (taskName: string, taskExecutor: unknown) => {
      definedTasks.set(taskName, taskExecutor);
    },
    isTaskDefined: (taskName: string) => definedTasks.has(taskName),
    isTaskRegisteredAsync: async (taskName: string) => registeredTasks.has(taskName),
    isAvailableAsync: async () => true,
    unregisterTaskAsync: async (taskName: string) => {
      registeredTasks.delete(taskName);
    },
    __definedTasks: definedTasks,
    __registeredTasks: registeredTasks,
  };
});

mock.module("expo-background-task", () => ({
  BackgroundTaskStatus: {
    Restricted: 1,
    Available: 2,
  },
  BackgroundTaskResult: {
    Success: 1,
    Failed: 2,
  },
  getStatusAsync: async () => 2,
  registerTaskAsync: async (taskName: string) => {
    const taskManager = (await import("expo-task-manager")) as unknown as {
      __registeredTasks: Set<string>;
    };
    taskManager.__registeredTasks.add(taskName);
  },
  unregisterTaskAsync: async (taskName: string) => {
    const taskManager = (await import("expo-task-manager")) as unknown as {
      __registeredTasks: Set<string>;
    };
    taskManager.__registeredTasks.delete(taskName);
  },
  triggerTaskWorkerForTestingAsync: async () => true,
  addExpirationListener: () => ({ remove: () => {} }),
}));

// Mock llama.rn for tests - provides stub implementation
mock.module("llama.rn", () => ({
  initLlama: mock(async () => ({
    completion: mock(async () => ({
      text: 'Generated text',
      tokens_evaluated: 10,
    })),
    queueCompletion: mock(async () => ({
      promise: Promise.resolve({
        text: 'Generated text',
        tokens_evaluated: 10,
      }),
      stop: async () => {},
    })),
    release: mock(async () => {}),
  })),
}));

// Mock react-native-blob-util to avoid Flow type parsing issues
mock.module("react-native-blob-util", () => ({
  default: {
    config: () => ({
      fetch: () => ({
        progress: () => {},
        then: (cb: (res: unknown) => void) => cb({ path: () => '/mock/path' }),
      }),
    }),
    fs: {
      dirs: {
        DocumentDir: '/mock/documents',
        CacheDir: '/mock/cache',
      },
      exists: async () => true,
      mkdir: async () => true,
      writeFile: async () => true,
      readFile: async () => '',
      unlink: async () => true,
    },
  },
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
