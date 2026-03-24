export const BYOK_PROVIDERS = ['openai', 'anthropic', 'google'] as const;

export type BYOKProviderType = (typeof BYOK_PROVIDERS)[number];

export interface BYOKConfig {
  enabled: boolean;
  provider: BYOKProviderType | null;
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
}

export type BYOKStoreActions = {
  updateConfig: (updater: (config: BYOKConfig) => BYOKConfig) => void;
  resetConfig: () => void;
};

export type BYOKStoreState = {
  config: BYOKConfig;
  actions: BYOKStoreActions;
};

export const EMPTY_BYOK_CONFIG: BYOKConfig = {
  enabled: false,
  provider: null,
  apiKey: null,
  baseUrl: null,
  model: null,
};

export function createBYOKSnapshot(
  config: BYOKConfig = EMPTY_BYOK_CONFIG
): Omit<BYOKStoreState, 'actions'> {
  return { config };
}

export function updateBYOKConfigSnapshot(
  state: Omit<BYOKStoreState, 'actions'>,
  updater: (config: BYOKConfig) => BYOKConfig
): Omit<BYOKStoreState, 'actions'> {
  return {
    ...state,
    config: updater(state.config),
  };
}

export function resetBYOKSnapshot(): Omit<BYOKStoreState, 'actions'> {
  return createBYOKSnapshot();
}

export function isBYOKProvider(value: string | null): value is BYOKProviderType {
  return value !== null && BYOK_PROVIDERS.includes(value as BYOKProviderType);
}
