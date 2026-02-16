import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export const BYOKProvider = ['openai', 'anthropic', 'google'] as const;
export type BYOKProviderType = (typeof BYOKProvider)[number];

export interface BYOKConfig {
  enabled: boolean;
  provider: BYOKProviderType | null;
  apiKey: string | null;
}

type BYOKStoreState = {
  config: BYOKConfig;
};

const initialByokConfig: BYOKConfig = {
  enabled: false,
  provider: null,
  apiKey: null,
};

const byokStore = createStore<BYOKStoreState>(() => ({
  config: initialByokConfig,
}));

export function getBYOKStoreConfig(): BYOKConfig {
  return byokStore.getState().config;
}

export function useBYOKStoreConfig<T>(selector: (config: BYOKConfig) => T): T {
  return useStore(byokStore, (state) => selector(state.config));
}

export function updateBYOKStoreConfig(updater: (config: BYOKConfig) => BYOKConfig): void {
  byokStore.setState((state) => ({
    config: updater(state.config),
  }));
}

export function resetBYOKStoreConfig(): void {
  byokStore.setState({ config: initialByokConfig });
}
