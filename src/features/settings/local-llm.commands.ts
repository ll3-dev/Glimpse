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
  type LocalModel,
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
