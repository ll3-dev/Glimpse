import type { BYOKProviderType } from './byok.types';

export type RegistryScope = 'app_only';

export interface PopularModelEntry {
  rank: number;
  id: string;
  name: string;
  provider: string;
  source: 'openrouter';
  capabilities: string[];
  isPreview?: boolean;
}

export interface ByokModelRegistry {
  schemaVersion: string;
  generatedAt: string;
  runtime: {
    scope: RegistryScope;
    externalUseAllowed: boolean;
  };
  popular: PopularModelEntry[];
  byok: {
    enabled: boolean;
    description: string;
    listEndpoint: string;
    requiresProviderConnection: boolean;
  };
  custom: {
    enabled: boolean;
    description: string;
    validationEndpoint: string;
    allowUnknownWithWarning: boolean;
    inputPlaceholder: string;
  };
  routing: {
    defaultPolicy: 'byok_first' | 'gateway_first' | 'strict_byok';
  };
  ui: {
    tabs: ('Popular' | 'BYOK' | 'Custom')[];
    defaultTab: 'Popular' | 'BYOK' | 'Custom';
    showModelId: boolean;
    showProvider: boolean;
  };
  selection: {
    defaultModelByProvider: Record<BYOKProviderType, string>;
    fallbackModelId: string;
    allowPreview: boolean;
  };
}

/**
 * App-local model registry.
 * This file externalizes model choices from command logic so they can be
 * adjusted without touching provider implementation details.
 */
export const BYOK_MODEL_REGISTRY: ByokModelRegistry = {
  schemaVersion: '1.1.0',
  generatedAt: '2026-02-22',
  runtime: {
    scope: 'app_only',
    externalUseAllowed: false,
  },
  popular: [
    {
      rank: 1,
      id: 'minimax/m2.5',
      name: 'MiniMax M2.5',
      provider: 'minimax',
      source: 'openrouter',
      capabilities: ['chat', 'reasoning', 'coding'],
    },
    {
      rank: 2,
      id: 'moonshotai/kimi-k2.5-0127',
      name: 'Kimi K2.5 0127',
      provider: 'moonshotai',
      source: 'openrouter',
      capabilities: ['chat', 'reasoning', 'long-context'],
    },
    {
      rank: 3,
      id: 'z-ai/glm-5',
      name: 'GLM 5',
      provider: 'z-ai',
      source: 'openrouter',
      capabilities: ['chat', 'reasoning', 'multilingual'],
    },
    {
      rank: 4,
      id: 'google/gemini-3-flash-preview',
      name: 'Gemini 3 Flash Preview',
      provider: 'google',
      source: 'openrouter',
      capabilities: ['chat', 'speed', 'multimodal'],
      isPreview: true,
    },
    {
      rank: 5,
      id: 'deepseek/deepseek-v3.2',
      name: 'DeepSeek V3.2',
      provider: 'deepseek',
      source: 'openrouter',
      capabilities: ['chat', 'coding', 'reasoning'],
    },
    {
      rank: 6,
      id: 'x-ai/grok-4.1-fast',
      name: 'Grok 4.1 Fast',
      provider: 'x-ai',
      source: 'openrouter',
      capabilities: ['chat', 'speed', 'tool-use'],
    },
    {
      rank: 7,
      id: 'anthropic/claude-opus-4.6',
      name: 'Claude Opus 4.6',
      provider: 'anthropic',
      source: 'openrouter',
      capabilities: ['chat', 'deep-reasoning', 'writing'],
    },
    {
      rank: 8,
      id: 'anthropic/claude-sonnet-4.5',
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      source: 'openrouter',
      capabilities: ['chat', 'balanced', 'coding'],
    },
    {
      rank: 9,
      id: 'trinity/trinity-large-preview',
      name: 'Trinity Large Preview (free)',
      provider: 'trinity',
      source: 'openrouter',
      capabilities: ['chat', 'general'],
      isPreview: true,
    },
    {
      rank: 10,
      id: 'google/gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'google',
      source: 'openrouter',
      capabilities: ['chat', 'speed', 'cost-efficient'],
    },
  ],
  byok: {
    enabled: true,
    description: 'User API key based model list',
    listEndpoint: '/api/v1/models/user',
    requiresProviderConnection: true,
  },
  custom: {
    enabled: true,
    description: 'Manual model ID input',
    validationEndpoint: '/api/v1/models',
    allowUnknownWithWarning: true,
    inputPlaceholder: 'e.g. anthropic/claude-sonnet-4.5',
  },
  routing: {
    defaultPolicy: 'byok_first',
  },
  ui: {
    tabs: ['Popular', 'BYOK', 'Custom'],
    defaultTab: 'Popular',
    showModelId: true,
    showProvider: true,
  },
  selection: {
    defaultModelByProvider: {
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-haiku-20240307',
      google: 'gemini-1.5-flash',
    },
    fallbackModelId: 'google/gemini-2.5-flash',
    allowPreview: true,
  },
};
