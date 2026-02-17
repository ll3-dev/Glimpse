import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * Local LLM model metadata
 */
export interface LocalModel {
  /** Unique model identifier */
  id: string;
  /** Display name */
  name: string;
  /** Model file path (for native module) */
  path?: string;
  /** Model size in bytes */
  size?: number;
  /** Whether model is fully downloaded and ready */
  isReady: boolean;
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
}

type LocalLLMStoreActions = {
  updateConfig: (updater: (config: LocalLLMConfig) => LocalLLMConfig) => void;
  resetConfig: () => void;
  setEnabled: (enabled: boolean) => void;
  selectModel: (modelId: string | null) => void;
  addModel: (model: LocalModel) => void;
  removeModel: (modelId: string) => void;
  updateModel: (modelId: string, updates: Partial<LocalModel>) => void;
};

type LocalLLMStoreState = {
  config: LocalLLMConfig;
  actions: LocalLLMStoreActions;
};

const initialLocalLLMConfig: LocalLLMConfig = {
  enabled: false,
  selectedModelId: null,
  availableModels: [],
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
    setEnabled: (enabled) => {
      set((state) => ({
        config: { ...state.config, enabled },
      }));
    },
    selectModel: (modelId) => {
      set((state) => ({
        config: { ...state.config, selectedModelId: modelId },
      }));
    },
    addModel: (model) => {
      set((state) => ({
        config: {
          ...state.config,
          availableModels: [...state.config.availableModels, model],
        },
      }));
    },
    removeModel: (modelId) => {
      set((state) => ({
        config: {
          ...state.config,
          availableModels: state.config.availableModels.filter((m) => m.id !== modelId),
          selectedModelId:
            state.config.selectedModelId === modelId ? null : state.config.selectedModelId,
        },
      }));
    },
    updateModel: (modelId, updates) => {
      set((state) => ({
        config: {
          ...state.config,
          availableModels: state.config.availableModels.map((m) =>
            m.id === modelId ? { ...m, ...updates } : m
          ),
        },
      }));
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
  localLLMStore.getState().actions.setEnabled(enabled);
}

export function selectLocalLLMModel(modelId: string | null): void {
  localLLMStore.getState().actions.selectModel(modelId);
}

export function addLocalLLMModel(model: LocalModel): void {
  localLLMStore.getState().actions.addModel(model);
}

export function removeLocalLLMModel(modelId: string): void {
  localLLMStore.getState().actions.removeModel(modelId);
}

export function updateLocalLLMModel(modelId: string, updates: Partial<LocalModel>): void {
  localLLMStore.getState().actions.updateModel(modelId, updates);
}
