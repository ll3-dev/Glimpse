import {
  addLocalLLMModelSnapshot,
  clearLocalLLMDownloadErrorSnapshot,
  clearLocalLLMDownloadSessionSnapshot,
  clearLocalLLMLoadErrorSnapshot,
  createLocalLLMConfigSnapshot,
  failLocalLLMDownloadSnapshot,
  failLocalLLMLoadingSnapshot,
  finishLocalLLMDownloadSnapshot,
  finishLocalLLMLoadingSnapshot,
  markLocalLLMDownloadCompletionHandledSnapshot,
  removeLocalLLMModelSnapshot,
  resetLocalLLMConfigSnapshot,
  selectLocalLLMModelSnapshot,
  setAvailableLocalLLMModelsSnapshot,
  setLocalLLMBannerDismissedSnapshot,
  setLocalLLMEnabledSnapshot,
  startLocalLLMDownloadSnapshot,
  startLocalLLMLoadingSnapshot,
  updateLocalLLMConfigSnapshot,
  updateLocalLLMDownloadProgressSnapshot,
  updateLocalLLMLoadProgressSnapshot,
  updateLocalLLMModelSnapshot,
  type DownloadProgress,
  type LocalLLMConfig,
  type LocalLLMModelFamily,
  type LocalLLMStoreState,
  type LocalModel,
  type LoadProgress,
} from '@/src/features/core/application/state';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { storage, StorageKeys } from '@/src/lib/storage';

function loadPersistedSettings(): { enabled: boolean; selectedModelId: string | null } {
  const enabled = storage.getBoolean(StorageKeys.LOCAL_LLM_ENABLED) ?? false;
  const selectedModelId = storage.getString(StorageKeys.LOCAL_LLM_SELECTED_MODEL) ?? null;
  return { enabled, selectedModelId };
}

const persistedSettings = loadPersistedSettings();

const localLLMStore = createStore<LocalLLMStoreState>((set) => ({
  config: createLocalLLMConfigSnapshot(persistedSettings),
  actions: {
    updateConfig: (updater) => {
      set((state) => updateLocalLLMConfigSnapshot(state, updater));
    },
    resetConfig: () => {
      set((state) => ({ ...state, config: resetLocalLLMConfigSnapshot(persistedSettings) }));
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

export function setLocalLLMEnabled(enabled: boolean): void {
  storage.set(StorageKeys.LOCAL_LLM_ENABLED, enabled);
  updateLocalLLMStoreConfig((config) => setLocalLLMEnabledSnapshot(config, enabled));
}

export function selectLocalLLMModel(modelId: string | null): void {
  if (modelId) {
    storage.set(StorageKeys.LOCAL_LLM_SELECTED_MODEL, modelId);
  } else {
    storage.remove(StorageKeys.LOCAL_LLM_SELECTED_MODEL);
  }
  updateLocalLLMStoreConfig((config) => selectLocalLLMModelSnapshot(config, modelId));
}

export function addLocalLLMModel(model: LocalModel): void {
  updateLocalLLMStoreConfig((config) => addLocalLLMModelSnapshot(config, model));
}

export function removeLocalLLMModel(modelId: string): void {
  updateLocalLLMStoreConfig((config) => removeLocalLLMModelSnapshot(config, modelId));
}

export function updateLocalLLMModel(modelId: string, updates: Partial<LocalModel>): void {
  updateLocalLLMStoreConfig((config) =>
    updateLocalLLMModelSnapshot(config, modelId, updates)
  );
}

export function setAvailableModels(models: LocalModel[]): void {
  updateLocalLLMStoreConfig((config) => setAvailableLocalLLMModelsSnapshot(config, models));
}

export function startLocalLLMDownload(modelId: string, sourceRoute?: string | null): void {
  updateLocalLLMStoreConfig((config) =>
    startLocalLLMDownloadSnapshot(config, modelId, sourceRoute)
  );
}

export function updateLocalLLMDownloadProgress(progress: DownloadProgress): void {
  updateLocalLLMStoreConfig((config) =>
    updateLocalLLMDownloadProgressSnapshot(config, progress)
  );
}

export function finishLocalLLMDownload(modelId: string, path: string): void {
  updateLocalLLMStoreConfig((config) =>
    finishLocalLLMDownloadSnapshot(config, modelId, path)
  );
}

export function failLocalLLMDownload(error: string): void {
  updateLocalLLMStoreConfig((config) => failLocalLLMDownloadSnapshot(config, error));
}

export function setLocalLLMBannerDismissed(isDismissed: boolean): void {
  updateLocalLLMStoreConfig((config) =>
    setLocalLLMBannerDismissedSnapshot(config, isDismissed)
  );
}

export function clearLocalLLMDownloadError(): void {
  updateLocalLLMStoreConfig((config) => clearLocalLLMDownloadErrorSnapshot(config));
}

export function markLocalLLMDownloadCompletionHandled(): void {
  updateLocalLLMStoreConfig((config) =>
    markLocalLLMDownloadCompletionHandledSnapshot(config)
  );
}

export function clearLocalLLMDownloadSession(): void {
  updateLocalLLMStoreConfig((config) => clearLocalLLMDownloadSessionSnapshot(config));
}

export function startLocalLLMLoading(): void {
  updateLocalLLMStoreConfig((config) => startLocalLLMLoadingSnapshot(config));
}

export function updateLocalLLMLoadProgress(progress: number): void {
  updateLocalLLMStoreConfig((config) => updateLocalLLMLoadProgressSnapshot(config, progress));
}

export function finishLocalLLMLoading(): void {
  updateLocalLLMStoreConfig((config) => finishLocalLLMLoadingSnapshot(config));
}

export function failLocalLLMLoading(error: string): void {
  updateLocalLLMStoreConfig((config) => failLocalLLMLoadingSnapshot(config, error));
}

export function clearLocalLLMLoadError(): void {
  updateLocalLLMStoreConfig((config) => clearLocalLLMLoadErrorSnapshot(config));
}

export type {
  DownloadProgress,
  LocalLLMConfig,
  LocalLLMModelFamily,
  LocalLLMStoreState,
  LocalModel,
  LoadProgress,
};
