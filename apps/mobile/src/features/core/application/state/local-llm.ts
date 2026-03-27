/**
 * Local LLM state snapshots and types.
 */

export type LocalLLMModelFamily =
  | 'llama'
  | 'mistral'
  | 'phi'
  | 'qwen'
  | 'qwen-chatml'
  | 'generic-instruct';

export interface DownloadProgress {
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type DownloadStatus = 'idle' | 'downloading' | 'completed' | 'error';

export interface LocalModel {
  id: string;
  family: LocalLLMModelFamily;
  name: string;
  size: number;
  downloaded: boolean;
  path?: string | null;
  downloadProgress?: DownloadProgress | null;
  loadProgress?: LoadProgress | null;
  loading?: boolean;
  loadError?: string | null;
  downloadError?: string | null;
  downloadCompletionHandled?: boolean;
  sourceRoute?: string | null;
  isReady?: boolean;
  filename?: string;
  repo?: string;
}

export interface LocalLLMConfig {
  enabled: boolean;
  selectedModelId: string | null;
  models: LocalModel[];
  bannerDismissed: boolean;
  availableModels: LocalModel[];
  downloadStatus: DownloadStatus;
  downloadProgress: DownloadProgress | null;
  downloadError: string | null;
  downloadingModelId: string | null;
  lastCompletedModelId: string | null;
  downloadSourceRoute: string | null;
  downloadCompletionHandled: boolean;
  isBannerDismissed: boolean;
  isLoading: boolean;
  loadProgress: LoadProgress | null;
  loadError: string | null;
}

export interface LocalLLMStoreState {
  config: LocalLLMConfig;
  actions: {
    updateConfig: (updater: (config: LocalLLMConfig) => LocalLLMConfig) => void;
    resetConfig: () => void;
  };
}

const EMPTY_DOWNLOAD_PROGRESS: DownloadProgress = {
  bytesReceived: 0,
  totalBytes: 0,
  percentage: 0,
};

const DEFAULT_LOAD_PROGRESS: LoadProgress = {
  loaded: 0,
  total: 100,
  percentage: 0,
};

function applyToModel(
  config: LocalLLMConfig,
  modelId: string | null,
  updates: Partial<LocalModel>
): LocalLLMConfig {
  return modelId ? updateLocalLLMModelSnapshot(config, modelId, updates) : config;
}

function resolveDownloadSessionModelId(config: LocalLLMConfig): string | null {
  return config.downloadingModelId ?? config.lastCompletedModelId;
}

function syncModelCollections(config: LocalLLMConfig, models: LocalModel[]): LocalLLMConfig {
  return { ...config, models, availableModels: models };
}

export function createLocalLLMConfigSnapshot(persisted: {
  enabled: boolean;
  selectedModelId: string | null;
}): LocalLLMConfig {
  return {
    enabled: persisted.enabled,
    selectedModelId: persisted.selectedModelId,
    models: [],
    bannerDismissed: false,
    availableModels: [],
    downloadStatus: 'idle',
    downloadProgress: null,
    downloadError: null,
    downloadingModelId: null,
    lastCompletedModelId: null,
    downloadSourceRoute: null,
    downloadCompletionHandled: false,
    isBannerDismissed: false,
    isLoading: false,
    loadProgress: null,
    loadError: null,
  };
}

export function resetLocalLLMConfigSnapshot(persisted: {
  enabled: boolean;
  selectedModelId: string | null;
}): LocalLLMConfig {
  return createLocalLLMConfigSnapshot(persisted);
}

export function updateLocalLLMConfigSnapshot(
  state: LocalLLMStoreState,
  updater: (config: LocalLLMConfig) => LocalLLMConfig
): Partial<LocalLLMStoreState> {
  return { config: updater(state.config) };
}

export function setLocalLLMEnabledSnapshot(config: LocalLLMConfig, enabled: boolean): LocalLLMConfig {
  return { ...config, enabled };
}

export function selectLocalLLMModelSnapshot(config: LocalLLMConfig, modelId: string | null): LocalLLMConfig {
  return { ...config, selectedModelId: modelId };
}

export function addLocalLLMModelSnapshot(config: LocalLLMConfig, model: LocalModel): LocalLLMConfig {
  return syncModelCollections(config, [...config.models, model]);
}

export function removeLocalLLMModelSnapshot(config: LocalLLMConfig, modelId: string): LocalLLMConfig {
  return syncModelCollections(
    config,
    config.models.filter((model) => model.id !== modelId)
  );
}

export function updateLocalLLMModelSnapshot(
  config: LocalLLMConfig,
  modelId: string,
  updates: Partial<LocalModel>
): LocalLLMConfig {
  return syncModelCollections(
    config,
    config.models.map((model) => (model.id === modelId ? { ...model, ...updates } : model))
  );
}

export function setAvailableLocalLLMModelsSnapshot(
  config: LocalLLMConfig,
  models: LocalModel[]
): LocalLLMConfig {
  return syncModelCollections(config, models);
}

export function startLocalLLMDownloadSnapshot(
  config: LocalLLMConfig,
  modelId: string,
  sourceRoute?: string | null
): LocalLLMConfig {
  const updated = applyToModel(config, modelId, {
    downloadProgress: EMPTY_DOWNLOAD_PROGRESS,
    downloadError: null,
    sourceRoute: sourceRoute ?? null,
  });
  return {
    ...updated,
    downloadStatus: 'downloading',
    downloadingModelId: modelId,
    downloadSourceRoute: sourceRoute ?? null,
    downloadProgress: EMPTY_DOWNLOAD_PROGRESS,
  };
}

export function updateLocalLLMDownloadProgressSnapshot(
  config: LocalLLMConfig,
  progress: DownloadProgress
): LocalLLMConfig {
  if (!config.downloadingModelId) {
    return config;
  }
  const updated = applyToModel(config, config.downloadingModelId, { downloadProgress: progress });
  return { ...updated, downloadProgress: progress };
}

export function finishLocalLLMDownloadSnapshot(
  config: LocalLLMConfig,
  modelId: string,
  path: string
): LocalLLMConfig {
  const updated = applyToModel(config, modelId, {
    downloaded: true,
    path,
    downloadProgress: null,
    isReady: true,
  });
  return {
    ...updated,
    downloadStatus: 'completed',
    lastCompletedModelId: modelId,
    downloadingModelId: null,
    downloadProgress: null,
  };
}

export function failLocalLLMDownloadSnapshot(config: LocalLLMConfig, error: string): LocalLLMConfig {
  if (!config.downloadingModelId) {
    return config;
  }
  const updated = applyToModel(config, config.downloadingModelId, { downloadError: error });
  return {
    ...updated,
    downloadStatus: 'error',
    downloadError: error,
  };
}

export function setLocalLLMBannerDismissedSnapshot(config: LocalLLMConfig, isDismissed: boolean): LocalLLMConfig {
  return { ...config, bannerDismissed: isDismissed, isBannerDismissed: isDismissed };
}

export function clearLocalLLMDownloadErrorSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  const modelId = resolveDownloadSessionModelId(config);
  if (!modelId) {
    return { ...config, downloadError: null, downloadStatus: 'idle' };
  }
  const updated = applyToModel(config, modelId, { downloadError: null });
  return { ...updated, downloadError: null, downloadStatus: 'idle' };
}

export function markLocalLLMDownloadCompletionHandledSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  if (!config.lastCompletedModelId) {
    return { ...config, downloadCompletionHandled: true, downloadStatus: 'idle' };
  }
  const updated = applyToModel(config, config.lastCompletedModelId, {
    downloadCompletionHandled: true,
  });
  return { ...updated, downloadCompletionHandled: true, downloadStatus: 'idle' };
}

export function clearLocalLLMDownloadSessionSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  const modelId = resolveDownloadSessionModelId(config);
  if (!modelId) {
    return {
      ...config,
      downloadProgress: null,
      downloadError: null,
      downloadCompletionHandled: false,
      downloadingModelId: null,
      lastCompletedModelId: null,
      downloadSourceRoute: null,
      downloadStatus: 'idle',
    };
  }

  const updated = applyToModel(config, modelId, {
    downloadProgress: null,
    downloadError: null,
    downloadCompletionHandled: false,
    sourceRoute: null,
  });

  return {
    ...updated,
    downloadProgress: null,
    downloadError: null,
    downloadCompletionHandled: false,
    downloadingModelId: null,
    lastCompletedModelId: null,
    downloadSourceRoute: null,
    downloadStatus: 'idle',
  };
}

export function startLocalLLMLoadingSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  return {
    ...config,
    isLoading: true,
    loadProgress: DEFAULT_LOAD_PROGRESS,
    loadError: null,
  };
}

export function updateLocalLLMLoadProgressSnapshot(
  config: LocalLLMConfig,
  progress: number
): LocalLLMConfig {
  if (!config.selectedModelId) {
    return config;
  }

  const loadProgress = { loaded: progress, total: 100, percentage: progress };
  const updated = applyToModel(config, config.selectedModelId, { loadProgress });
  return { ...updated, loadProgress };
}

export function finishLocalLLMLoadingSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  if (!config.selectedModelId) {
    return { ...config, isLoading: false, loadProgress: null };
  }
  const updated = applyToModel(config, config.selectedModelId, {
    loading: false,
    loadProgress: null,
  });
  return { ...updated, isLoading: false, loadProgress: null };
}

export function failLocalLLMLoadingSnapshot(config: LocalLLMConfig, error: string): LocalLLMConfig {
  if (!config.selectedModelId) {
    return { ...config, isLoading: false, loadError: error };
  }
  const updated = applyToModel(config, config.selectedModelId, {
    loading: false,
    loadError: error,
  });
  return { ...updated, isLoading: false, loadError: error };
}

export function clearLocalLLMLoadErrorSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  if (!config.selectedModelId) {
    return { ...config, loadError: null };
  }
  const updated = applyToModel(config, config.selectedModelId, { loadError: null });
  return { ...updated, loadError: null };
}
