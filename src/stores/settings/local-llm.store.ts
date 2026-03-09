import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { storage, StorageKeys } from '@/src/lib/storage';
import type { LocalLLMModelFamily } from '@/src/features/ai/local-llm';

/**
 * Local LLM model metadata
 */
export interface LocalModel {
  /** Unique model identifier */
  id: string;
  /** Display name */
  name: string;
  /** Prompt/template family used for this model */
  family?: LocalLLMModelFamily;
  /** Model file path (for native module) */
  path?: string;
  /** Model size in bytes */
  size?: number;
  /** Whether model is fully downloaded and ready */
  isReady: boolean;
  /** HuggingFace repo (for downloads) */
  repo?: string;
  /** GGUF filename in the repo */
  filename?: string;
}

/**
 * Download progress information
 */
export interface DownloadProgress {
  /** Bytes written so far */
  written: number;
  /** Total bytes to download */
  total: number;
  /** Progress percentage (0-100) */
  percentage: number;
}

/**
 * Loading progress information
 */
export interface LoadProgress {
  /** Progress percentage (0-100) */
  percentage: number;
  /** Current loading stage */
  stage: 'loading' | 'initializing' | 'ready';
}

/**
 * Local LLM configuration state
 */
export interface LocalLLMConfig {
  /** Whether Local LLM is enabled */
  enabled: boolean;
  /** Currently selected model ID */
  selectedModelId: string | null;
  /** List of available/downloaded models */
  availableModels: LocalModel[];

  // Download state
  /** ID of model currently being downloaded */
  downloadingModelId: string | null;
  /** Detailed download progress information */
  downloadProgress: DownloadProgress | null;
  /** Download error message */
  downloadError: string | null;

  // Loading state
  /** Whether model is being loaded into memory */
  isLoading: boolean;
  /** Loading progress (0-100) */
  loadProgress: number;
  /** Loading error message */
  loadError: string | null;
}

type LocalLLMStoreState = {
  config: LocalLLMConfig;
  actions: {
    updateConfig: (updater: (config: LocalLLMConfig) => LocalLLMConfig) => void;
    resetConfig: () => void;
  };
};

/**
 * Load persisted settings from MMKV
 */
function loadPersistedSettings(): { enabled: boolean; selectedModelId: string | null } {
  const enabled = storage.getBoolean(StorageKeys.LOCAL_LLM_ENABLED) ?? false;
  const selectedModelId = storage.getString(StorageKeys.LOCAL_LLM_SELECTED_MODEL) ?? null;
  return { enabled, selectedModelId };
}

const persistedSettings = loadPersistedSettings();

const initialLocalLLMConfig: LocalLLMConfig = {
  enabled: persistedSettings.enabled,
  selectedModelId: persistedSettings.selectedModelId,
  availableModels: [],

  downloadingModelId: null,
  downloadProgress: null,
  downloadError: null,

  isLoading: false,
  loadProgress: 0,
  loadError: null,
};

const localLLMStore = createStore<LocalLLMStoreState>((set) => ({
  config: initialLocalLLMConfig,
  actions: {
    updateConfig: (updater) => {
      set((state) => ({
        config: updater(state.config),
      }));
    },
    resetConfig: () => {
      set({ config: initialLocalLLMConfig });
    },
  },
}));

export function getLocalLLMStoreConfig(): LocalLLMConfig {
  return localLLMStore.getState().config;
}

export function useLocalLLMStoreConfig<T>(selector: (config: LocalLLMConfig) => T): T {
  return useStore(localLLMStore, (state) => selector(state.config));
}

export function updateLocalLLMStoreConfig(
  updater: (config: LocalLLMConfig) => LocalLLMConfig
): void {
  localLLMStore.getState().actions.updateConfig(updater);
}

export function resetLocalLLMStoreConfig(): void {
  localLLMStore.getState().actions.resetConfig();
}

// ============================================
// Helper functions for common operations
// ============================================

export function setLocalLLMEnabled(enabled: boolean): void {
  storage.set(StorageKeys.LOCAL_LLM_ENABLED, enabled);
  updateLocalLLMStoreConfig((config) => ({ ...config, enabled }));
}

export function selectLocalLLMModel(modelId: string | null): void {
  if (modelId) {
    storage.set(StorageKeys.LOCAL_LLM_SELECTED_MODEL, modelId);
  } else {
    storage.remove(StorageKeys.LOCAL_LLM_SELECTED_MODEL);
  }
  updateLocalLLMStoreConfig((config) => ({ ...config, selectedModelId: modelId }));
}

export function addLocalLLMModel(model: LocalModel): void {
  updateLocalLLMStoreConfig((config) => ({
    ...config,
    availableModels: [...config.availableModels, model],
  }));
}

export function removeLocalLLMModel(modelId: string): void {
  updateLocalLLMStoreConfig((config) => ({
    ...config,
    availableModels: config.availableModels.filter((m) => m.id !== modelId),
    selectedModelId: config.selectedModelId === modelId ? null : config.selectedModelId,
  }));
}

export function updateLocalLLMModel(modelId: string, updates: Partial<LocalModel>): void {
  updateLocalLLMStoreConfig((config) => ({
    ...config,
    availableModels: config.availableModels.map((m) =>
      m.id === modelId ? { ...m, ...updates } : m
    ),
  }));
}

// ============================================
// Download state helpers
// ============================================

export function startLocalLLMDownload(modelId: string): void {
  updateLocalLLMStoreConfig((config) => ({
    ...config,
    downloadingModelId: modelId,
    downloadProgress: {
      written: 0,
      total: 0,
      percentage: 0,
    },
    downloadError: null,
  }));
}

export function updateLocalLLMDownloadProgress(progress: DownloadProgress): void {
  updateLocalLLMStoreConfig((config) => ({ ...config, downloadProgress: progress }));
}

export function finishLocalLLMDownload(modelId: string, path: string): void {
  updateLocalLLMStoreConfig((config) => ({
    ...config,
    downloadingModelId: null,
    downloadProgress: {
      written: 0,
      total: 0,
      percentage: 100,
    },
    downloadError: null,
    availableModels: config.availableModels.map((m) =>
      m.id === modelId ? { ...m, isReady: true, path } : m
    ),
  }));
}

export function failLocalLLMDownload(error: string): void {
  updateLocalLLMStoreConfig((config) => ({
    ...config,
    downloadingModelId: null,
    downloadProgress: null,
    downloadError: error,
  }));
}

export function clearLocalLLMDownloadError(): void {
  updateLocalLLMStoreConfig((config) => ({ ...config, downloadError: null }));
}

// ============================================
// Loading state helpers
// ============================================

export function startLocalLLMLoading(): void {
  updateLocalLLMStoreConfig((config) => ({
    ...config,
    isLoading: true,
    loadProgress: 0,
    loadError: null,
  }));
}

export function updateLocalLLMLoadProgress(progress: number): void {
  updateLocalLLMStoreConfig((config) => ({ ...config, loadProgress: progress }));
}

export function finishLocalLLMLoading(): void {
  updateLocalLLMStoreConfig((config) => ({
    ...config,
    isLoading: false,
    loadProgress: 100,
    loadError: null,
  }));
}

export function failLocalLLMLoading(error: string): void {
  updateLocalLLMStoreConfig((config) => ({
    ...config,
    isLoading: false,
    loadProgress: 0,
    loadError: error,
  }));
}

export function clearLocalLLMLoadError(): void {
  updateLocalLLMStoreConfig((config) => ({ ...config, loadError: null }));
}
