export type LocalLLMModelFamily = 'generic-instruct' | 'qwen-chatml';

export interface LocalModel {
  id: string;
  name: string;
  family?: LocalLLMModelFamily;
  path?: string;
  size?: number;
  isReady: boolean;
  repo?: string;
  filename?: string;
}

export interface DownloadProgress {
  written: number;
  total: number;
  percentage: number;
}

export interface LoadProgress {
  percentage: number;
  stage: 'loading' | 'initializing' | 'ready';
}

export interface LocalLLMConfig {
  enabled: boolean;
  selectedModelId: string | null;
  availableModels: LocalModel[];
  downloadingModelId: string | null;
  downloadProgress: DownloadProgress | null;
  downloadError: string | null;
  downloadStatus: 'idle' | 'downloading' | 'completed' | 'error';
  downloadSourceRoute: string | null;
  lastCompletedModelId: string | null;
  downloadCompletionHandled: boolean;
  isBannerDismissed: boolean;
  isLoading: boolean;
  loadProgress: number;
  loadError: string | null;
}

export type LocalLLMStoreActions = {
  updateConfig: (updater: (config: LocalLLMConfig) => LocalLLMConfig) => void;
  resetConfig: () => void;
};

export type LocalLLMStoreState = {
  config: LocalLLMConfig;
  actions: LocalLLMStoreActions;
};

export function createLocalLLMConfigSnapshot(
  persisted: Pick<LocalLLMConfig, 'enabled' | 'selectedModelId'> = {
    enabled: false,
    selectedModelId: null,
  }
): Omit<LocalLLMStoreState, 'actions'> {
  return {
    config: {
      enabled: persisted.enabled,
      selectedModelId: persisted.selectedModelId,
      availableModels: [],
      downloadingModelId: null,
      downloadProgress: null,
      downloadError: null,
      downloadStatus: 'idle',
      downloadSourceRoute: null,
      lastCompletedModelId: null,
      downloadCompletionHandled: true,
      isBannerDismissed: false,
      isLoading: false,
      loadProgress: 0,
      loadError: null,
    },
  };
}

export function updateLocalLLMConfigSnapshot(
  state: Omit<LocalLLMStoreState, 'actions'>,
  updater: (config: LocalLLMConfig) => LocalLLMConfig
): Omit<LocalLLMStoreState, 'actions'> {
  return {
    ...state,
    config: updater(state.config),
  };
}

export function resetLocalLLMConfigSnapshot(
  persisted: Pick<LocalLLMConfig, 'enabled' | 'selectedModelId'> = {
    enabled: false,
    selectedModelId: null,
  }
): Omit<LocalLLMStoreState, 'actions'> {
  return createLocalLLMConfigSnapshot(persisted);
}

export function setLocalLLMEnabledSnapshot(
  config: LocalLLMConfig,
  enabled: boolean
): LocalLLMConfig {
  return { ...config, enabled };
}

export function selectLocalLLMModelSnapshot(
  config: LocalLLMConfig,
  modelId: string | null
): LocalLLMConfig {
  return { ...config, selectedModelId: modelId };
}

export function setAvailableLocalLLMModelsSnapshot(
  config: LocalLLMConfig,
  models: LocalModel[]
): LocalLLMConfig {
  return {
    ...config,
    availableModels: models,
    selectedModelId:
      config.selectedModelId && models.some((model) => model.id === config.selectedModelId)
        ? config.selectedModelId
        : null,
  };
}

export function addLocalLLMModelSnapshot(
  config: LocalLLMConfig,
  model: LocalModel
): LocalLLMConfig {
  return {
    ...config,
    availableModels: [...config.availableModels, model],
  };
}

export function removeLocalLLMModelSnapshot(
  config: LocalLLMConfig,
  modelId: string
): LocalLLMConfig {
  return {
    ...config,
    availableModels: config.availableModels.filter((model) => model.id !== modelId),
    selectedModelId: config.selectedModelId === modelId ? null : config.selectedModelId,
  };
}

export function updateLocalLLMModelSnapshot(
  config: LocalLLMConfig,
  modelId: string,
  updates: Partial<LocalModel>
): LocalLLMConfig {
  return {
    ...config,
    availableModels: config.availableModels.map((model) =>
      model.id === modelId ? { ...model, ...updates } : model
    ),
  };
}

export function startLocalLLMDownloadSnapshot(
  config: LocalLLMConfig,
  modelId: string,
  sourceRoute?: string | null
): LocalLLMConfig {
  return {
    ...config,
    downloadingModelId: modelId,
    downloadProgress: {
      written: 0,
      total: 0,
      percentage: 0,
    },
    downloadError: null,
    downloadStatus: 'downloading',
    downloadSourceRoute: sourceRoute ?? config.downloadSourceRoute ?? null,
    lastCompletedModelId: null,
    downloadCompletionHandled: true,
    isBannerDismissed: false,
  };
}

export function updateLocalLLMDownloadProgressSnapshot(
  config: LocalLLMConfig,
  progress: DownloadProgress
): LocalLLMConfig {
  return {
    ...config,
    downloadProgress: progress,
  };
}

export function finishLocalLLMDownloadSnapshot(
  config: LocalLLMConfig,
  modelId: string,
  path: string
): LocalLLMConfig {
  return {
    ...config,
    downloadingModelId: null,
    downloadProgress: {
      written: 0,
      total: 0,
      percentage: 100,
    },
    downloadError: null,
    downloadStatus: 'completed',
    lastCompletedModelId: modelId,
    downloadCompletionHandled: false,
    isBannerDismissed: false,
    availableModels: config.availableModels.map((model) =>
      model.id === modelId ? { ...model, isReady: true, path } : model
    ),
  };
}

export function failLocalLLMDownloadSnapshot(
  config: LocalLLMConfig,
  error: string
): LocalLLMConfig {
  return {
    ...config,
    downloadingModelId: null,
    downloadProgress: null,
    downloadError: error,
    downloadStatus: 'error',
    downloadCompletionHandled: true,
    isBannerDismissed: false,
  };
}

export function setLocalLLMBannerDismissedSnapshot(
  config: LocalLLMConfig,
  isDismissed: boolean
): LocalLLMConfig {
  return {
    ...config,
    isBannerDismissed: isDismissed,
  };
}

export function clearLocalLLMDownloadErrorSnapshot(
  config: LocalLLMConfig
): LocalLLMConfig {
  return {
    ...config,
    downloadError: null,
    downloadStatus: config.downloadStatus === 'error' ? 'idle' : config.downloadStatus,
  };
}

export function markLocalLLMDownloadCompletionHandledSnapshot(
  config: LocalLLMConfig
): LocalLLMConfig {
  return {
    ...config,
    downloadCompletionHandled: true,
    downloadStatus: config.downloadStatus === 'completed' ? 'idle' : config.downloadStatus,
  };
}

export function clearLocalLLMDownloadSessionSnapshot(
  config: LocalLLMConfig
): LocalLLMConfig {
  return {
    ...config,
    downloadingModelId: null,
    downloadProgress: null,
    downloadError: null,
    downloadStatus: 'idle',
    downloadSourceRoute: null,
    lastCompletedModelId: null,
    downloadCompletionHandled: true,
  };
}

export function startLocalLLMLoadingSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  return {
    ...config,
    isLoading: true,
    loadProgress: 0,
    loadError: null,
  };
}

export function updateLocalLLMLoadProgressSnapshot(
  config: LocalLLMConfig,
  progress: number
): LocalLLMConfig {
  return {
    ...config,
    loadProgress: progress,
  };
}

export function finishLocalLLMLoadingSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  return {
    ...config,
    isLoading: false,
    loadProgress: 100,
    loadError: null,
  };
}

export function failLocalLLMLoadingSnapshot(
  config: LocalLLMConfig,
  error: string
): LocalLLMConfig {
  return {
    ...config,
    isLoading: false,
    loadProgress: 0,
    loadError: error,
  };
}

export function clearLocalLLMLoadErrorSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  return {
    ...config,
    loadError: null,
  };
}
