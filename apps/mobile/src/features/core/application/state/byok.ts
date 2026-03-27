/**
 * BYOK state snapshots and types.
 */

export const BYOK_PROVIDERS = ['openai', 'anthropic', 'google'] as const;
export type BYOKProviderType = (typeof BYOK_PROVIDERS)[number];

export function isBYOKProvider(value: unknown): value is BYOKProviderType {
  return typeof value === 'string' && BYOK_PROVIDERS.includes(value as BYOKProviderType);
}

export interface BYOKConfig {
  enabled: boolean;
  provider: BYOKProviderType | null;
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
}

export interface BYOKStoreActions {
  updateConfig: (updater: (config: BYOKConfig) => BYOKConfig) => void;
  resetConfig: () => void;
}

export interface BYOKStoreState {
  config: BYOKConfig;
  actions: BYOKStoreActions;
}

export function createBYOKSnapshot(persisted: BYOKConfig): BYOKConfig {
  return { ...persisted };
}

export function resetBYOKSnapshot(): BYOKConfig {
  return {
    enabled: false,
    provider: null,
    apiKey: null,
    baseUrl: null,
    model: null,
  };
}

export function updateBYOKConfigSnapshot(
  state: BYOKStoreState,
  updater: (config: BYOKConfig) => BYOKConfig
): Partial<BYOKStoreState> {
  return { config: updater(state.config) };
}
