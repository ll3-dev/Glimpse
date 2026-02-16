import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export const BYOKProvider = ['openai', 'anthropic', 'google'] as const;
export type BYOKProviderType = (typeof BYOKProvider)[number];

export interface BYOKConfig {
  enabled: boolean;
  provider: BYOKProviderType | null;
  apiKey: string | null;
}

type BYOKStoreActions = {
  updateConfig: (updater: (config: BYOKConfig) => BYOKConfig) => void;
  resetConfig: () => void;
};

type BYOKStoreState = {
  config: BYOKConfig;
  actions: BYOKStoreActions;
};

const initialByokConfig: BYOKConfig = {
  enabled: false,
  provider: null,
  apiKey: null,
};

const byokStore = createStore<BYOKStoreState>((set) => ({
  config: initialByokConfig,
  actions: {
    updateConfig: (updater) => {
      set((state) => ({
        config: updater(state.config),
      }));
    },
    resetConfig: () => {
      set({ config: initialByokConfig });
    },
  },
}));

export function getBYOKStoreConfig(): BYOKConfig {
  return byokStore.getState().config;
}

export function useBYOKStoreConfig<T>(selector: (config: BYOKConfig) => T): T {
  return useStore(byokStore, (state) => selector(state.config));
}

export function updateBYOKStoreConfig(updater: (config: BYOKConfig) => BYOKConfig): void {
  byokStore.getState().actions.updateConfig(updater);
}

export function resetBYOKStoreConfig(): void {
  byokStore.getState().actions.resetConfig();
}
