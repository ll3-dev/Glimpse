/**
 * Local LLM selectors
 *
 * Provides read-only access to Local LLM configuration state.
 */

import {
  getLocalLLMStoreConfig,
  useLocalLLMStoreConfig,
  type LocalLLMConfig,
  type LocalModel,
} from '@/src/stores/settings/local-llm.store';

// Re-export types for convenience
export type { LocalLLMConfig, LocalModel };

/**
 * Get the full Local LLM configuration
 */
export function getLocalLLMConfig(): LocalLLMConfig {
  return { ...getLocalLLMStoreConfig() };
}

/**
 * Hook for selecting from Local LLM config
 */
export function useLocalLLMConfig<T>(selector: (config: LocalLLMConfig) => T): T {
  return useLocalLLMStoreConfig(selector);
}

/**
 * Check if Local LLM is enabled
 */
export function isLocalLLMEnabled(): boolean {
  return getLocalLLMStoreConfig().enabled;
}

/**
 * Hook for checking if Local LLM is enabled
 */
export function useLocalLLMEnabled(): boolean {
  return useLocalLLMStoreConfig((config) => config.enabled);
}

/**
 * Check if Local LLM is ready (enabled + model selected + model ready)
 */
export function isLocalLLMReady(): boolean {
  const config = getLocalLLMStoreConfig();
  if (!config.enabled || !config.selectedModelId) {
    return false;
  }
  const selectedModel = config.availableModels.find((m) => m.id === config.selectedModelId);
  return selectedModel?.isReady ?? false;
}

/**
 * Hook for checking if Local LLM is ready
 */
export function useLocalLLMReady(): boolean {
  return useLocalLLMStoreConfig((config) => {
    if (!config.enabled || !config.selectedModelId) {
      return false;
    }
    const selectedModel = config.availableModels.find((m) => m.id === config.selectedModelId);
    return selectedModel?.isReady ?? false;
  });
}

/**
 * Get the currently selected model
 */
export function getSelectedLocalModel(): LocalModel | null {
  const config = getLocalLLMStoreConfig();
  if (!config.selectedModelId) {
    return null;
  }
  return config.availableModels.find((m) => m.id === config.selectedModelId) ?? null;
}

/**
 * Hook for getting the currently selected model
 */
export function useSelectedLocalModel(): LocalModel | null {
  return useLocalLLMStoreConfig((config) => {
    if (!config.selectedModelId) {
      return null;
    }
    return config.availableModels.find((m) => m.id === config.selectedModelId) ?? null;
  });
}

/**
 * Get all available models
 */
export function getAvailableLocalModels(): LocalModel[] {
  return [...getLocalLLMStoreConfig().availableModels];
}

/**
 * Hook for getting all available models
 */
export function useAvailableLocalModels(): LocalModel[] {
  return useLocalLLMStoreConfig((config) => config.availableModels);
}

/**
 * Get the selected model ID
 */
export function getSelectedLocalModelId(): string | null {
  return getLocalLLMStoreConfig().selectedModelId;
}

/**
 * Hook for getting the selected model ID
 */
export function useSelectedLocalModelId(): string | null {
  return useLocalLLMStoreConfig((config) => config.selectedModelId);
}
