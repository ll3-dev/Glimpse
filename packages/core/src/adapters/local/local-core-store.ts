import type {
  Conversation,
  FeedbackEvent,
  KnowledgeItem,
  Message,
  Recommendation,
} from '@glimpse/shared';
import type { KeyValueStorage } from '../../ports/key-value-storage';

const CORE_STORE_KEY = 'glimpse-core-store-v1';
const CORE_STORE_VERSION = 1;

export interface CoreStoreData {
  knowledgeItems: Record<string, KnowledgeItem>;
  conversations: Record<string, Conversation>;
  messages: Record<string, Message>;
  recommendations: Record<string, Recommendation>;
  feedbackEvents: Record<string, FeedbackEvent>;
}

interface VersionedCoreStore {
  version: number;
  data: CoreStoreData;
}

const EMPTY_STORE: CoreStoreData = {
  knowledgeItems: {},
  conversations: {},
  messages: {},
  recommendations: {},
  feedbackEvents: {},
};

function cloneStoreData(data: CoreStoreData): CoreStoreData {
  return {
    knowledgeItems: { ...data.knowledgeItems },
    conversations: { ...data.conversations },
    messages: { ...data.messages },
    recommendations: { ...data.recommendations },
    feedbackEvents: { ...data.feedbackEvents },
  };
}

function getWebStorage(): Storage | null {
  if (typeof globalThis.localStorage === 'undefined') {
    return null;
  }

  return globalThis.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRecordMap<T>(value: unknown): Record<string, T> {
  return isRecord(value) ? (value as Record<string, T>) : {};
}

function normalizeStoreData(value: unknown): CoreStoreData {
  if (!isRecord(value)) {
    return cloneStoreData(EMPTY_STORE);
  }

  return {
    knowledgeItems: normalizeRecordMap<KnowledgeItem>(value.knowledgeItems),
    conversations: normalizeRecordMap<Conversation>(value.conversations),
    messages: normalizeRecordMap<Message>(value.messages),
    recommendations: normalizeRecordMap<Recommendation>(value.recommendations),
    feedbackEvents: normalizeRecordMap<FeedbackEvent>(value.feedbackEvents),
  };
}

function serializeStoreData(data: CoreStoreData): string {
  const payload: VersionedCoreStore = {
    version: CORE_STORE_VERSION,
    data,
  };

  return JSON.stringify(payload);
}

function parseStoreData(raw: string | undefined): {
  data: CoreStoreData;
  needsMigration: boolean;
} {
  if (!raw) {
    return {
      data: cloneStoreData(EMPTY_STORE),
      needsMigration: false,
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (isRecord(parsed) && typeof parsed.version === 'number') {
      const versioned = parsed as Partial<VersionedCoreStore>;

      if (versioned.version === CORE_STORE_VERSION) {
        return {
          data: normalizeStoreData(versioned.data),
          needsMigration: false,
        };
      }
    }

    return {
      data: normalizeStoreData(parsed),
      needsMigration: true,
    };
  } catch {
    return {
      data: cloneStoreData(EMPTY_STORE),
      needsMigration: false,
    };
  }
}

export function createLocalCoreStore(storage: KeyValueStorage) {
  function readRawStore(): string | undefined {
    const webStorage = getWebStorage();
    if (webStorage) {
      return webStorage.getItem(CORE_STORE_KEY) ?? undefined;
    }

    return storage.getString(CORE_STORE_KEY);
  }

  function writeRawStore(value: string): void {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.setItem(CORE_STORE_KEY, value);
      return;
    }

    storage.set(CORE_STORE_KEY, value);
  }

  function readCoreStore(): CoreStoreData {
    const parsed = parseStoreData(readRawStore());

    if (parsed.needsMigration) {
      writeCoreStore(parsed.data);
    }

    return parsed.data;
  }

  function writeCoreStore(data: CoreStoreData): void {
    writeRawStore(serializeStoreData(data));
  }

  function updateCoreStore<T>(updater: (data: CoreStoreData) => T): T {
    const current = readCoreStore();
    const draft = cloneStoreData(current);
    const result = updater(draft);
    writeCoreStore(draft);
    return result;
  }

  function resetCoreStoreForTests(): void {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.removeItem(CORE_STORE_KEY);
      return;
    }

    storage.remove(CORE_STORE_KEY);
  }

  return {
    readCoreStore,
    writeCoreStore,
    updateCoreStore,
    resetCoreStoreForTests,
    __localCoreStoreTestUtils: {
      getKey(): string {
        return CORE_STORE_KEY;
      },
      readRawStore,
      writeRawStore,
    },
  };
}
