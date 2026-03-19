/**
 * Local LLM commands
 *
 * Provides write operations for Local LLM configuration state.
 */

import {
  getLocalLLMStoreConfig,
  updateLocalLLMStoreConfig,
  resetLocalLLMStoreConfig,
  setLocalLLMEnabled,
  selectLocalLLMModel,
  addLocalLLMModel,
  removeLocalLLMModel,
  updateLocalLLMModel,
  startLocalLLMDownload,
  updateLocalLLMDownloadProgress,
  finishLocalLLMDownload,
  failLocalLLMDownload,
  clearLocalLLMDownloadError,
  markLocalLLMDownloadCompletionHandled,
  clearLocalLLMDownloadSession,
  setLocalLLMBannerDismissed,
  startLocalLLMLoading,
  updateLocalLLMLoadProgress,
  finishLocalLLMLoading,
  failLocalLLMLoading,
  clearLocalLLMLoadError,
  type LocalModel,
  type DownloadProgress,
} from '@/src/stores/settings/local-llm.store';

/**
 * Enable Local LLM
 * Requires a selected model that is ready.
 */
export function enableLocalLLM(): { success: boolean; error?: string } {
  const config = getLocalLLMStoreConfig();

  if (!config.selectedModelId) {
    return { success: false, error: '모델을 먼저 선택해주세요' };
  }

  const selectedModel = config.availableModels.find((m) => m.id === config.selectedModelId);
  if (!selectedModel) {
    return { success: false, error: '선택된 모델을 찾을 수 없습니다' };
  }

  if (!selectedModel.isReady) {
    return { success: false, error: '모델이 아직 다운로드되지 않았습니다' };
  }

  setLocalLLMEnabled(true);
  return { success: true };
}

/**
 * Disable Local LLM
 */
export function disableLocalLLM(): void {
  setLocalLLMEnabled(false);
}

/**
 * Select a model for Local LLM
 * The model must exist in availableModels.
 */
export function selectModel(modelId: string | null): { success: boolean; error?: string } {
  if (modelId === null) {
    selectLocalLLMModel(null);
    return { success: true };
  }

  const config = getLocalLLMStoreConfig();
  const model = config.availableModels.find((m) => m.id === modelId);

  if (!model) {
    return { success: false, error: '존재하지 않는 모델입니다' };
  }

  selectLocalLLMModel(modelId);
  return { success: true };
}

/**
 * Add a new model to the available models list
 */
export function addModel(model: LocalModel): void {
  addLocalLLMModel(model);
}

/**
 * Remove a model from the available models list
 * If the removed model was selected, clears the selection.
 */
export function removeModel(modelId: string): void {
  removeLocalLLMModel(modelId);
}

/**
 * Update a model's metadata
 */
export function updateModel(modelId: string, updates: Partial<LocalModel>): void {
  updateLocalLLMModel(modelId, updates);
}

/**
 * Mark a model as downloaded and ready
 */
export function markModelReady(modelId: string): void {
  updateLocalLLMModel(modelId, { isReady: true });
}

/**
 * Clear all Local LLM settings
 */
export function clearLocalLLMSettings(): void {
  resetLocalLLMStoreConfig();
}

/**
 * Set multiple models at once (for bulk import/initialization)
 */
export function setAvailableModels(models: LocalModel[]): void {
  updateLocalLLMStoreConfig((config) => ({
    ...config,
    availableModels: models,
    // Clear selection if selected model is no longer in the list
    selectedModelId:
      config.selectedModelId && models.some((m) => m.id === config.selectedModelId)
        ? config.selectedModelId
        : null,
  }));
}

// ============================================
// Download Commands
// ============================================

/**
 * Start downloading a model
 */
export function startDownload(modelId: string, sourceRoute?: string | null): void {
  startLocalLLMDownload(modelId, sourceRoute);
}

/**
 * Update download progress
 */
export function updateDownloadProgress(progress: DownloadProgress): void {
  updateLocalLLMDownloadProgress(progress);
}

/**
 * Finish model download successfully
 */
export function finishDownload(modelId: string, path: string): void {
  finishLocalLLMDownload(modelId, path);
}

/**
 * Fail model download with error
 */
export function failDownload(error: string): void {
  failLocalLLMDownload(error);
}

/**
 * Clear download error
 */
export function clearDownloadError(): void {
  clearLocalLLMDownloadError();
}

export function markDownloadCompletionHandled(): void {
  markLocalLLMDownloadCompletionHandled();
}

export function clearDownloadSession(): void {
  clearLocalLLMDownloadSession();
}

/**
 * Manually dismiss the download banner
 */
export function setBannerDismissed(isDismissed: boolean): void {
  setLocalLLMBannerDismissed(isDismissed);
}

// ============================================
// Loading Commands
// ============================================

/**
 * Start loading a model into memory
 */
export function startLoading(): void {
  startLocalLLMLoading();
}

/**
 * Update model loading progress
 */
export function updateLoadProgress(progress: number): void {
  updateLocalLLMLoadProgress(progress);
}

/**
 * Finish loading model successfully
 */
export function finishLoading(): void {
  finishLocalLLMLoading();
}

/**
 * Fail loading with error
 */
export function failLoading(error: string): void {
  failLocalLLMLoading(error);
}

/**
 * Clear loading error
 */
export function clearLoadError(): void {
  clearLocalLLMLoadError();
}
