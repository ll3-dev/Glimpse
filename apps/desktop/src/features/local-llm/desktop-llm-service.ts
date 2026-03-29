/**
 * Desktop LLM Service
 *
 * Provides local LLM runtime management for the desktop app.
 * Types are self-contained until @glimpse/core AI types are promoted.
 */

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// Types (mirrored from eventual @glimpse/core/ai/runtime-registry)
// ============================================================================

export interface DesktopLLMRuntimeDescriptor {
  id: string;
  displayName: string;
  priority: number;
  availability: 'available' | 'degraded' | 'unavailable';
  reason: string | null;
}

export type DesktopLLMRuntimeId = string;

export interface ManagedModelRecord {
  id: string;
  name: string;
  family: string;
  quantization: string;
  format: string;
  path: string | null;
  size: number;
  contextLength: number;
  supportsEmbedding: boolean;
  supportsTools: boolean;
  status: string;
}

export interface CompletionRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  modelId?: string;
}

export interface CompletionResponse {
  text: string;
  tokensUsed: number;
  modelId: string;
}

export interface EmbeddingRequest {
  text: string;
  modelId?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  tokensUsed: number;
  modelId: string;
}

export interface RuntimeHealth {
  status: string;
  loadedModelId: string | null;
  lastUnloadAt: number | null;
  queueDepth: number;
  memoryPressure: 'normal' | 'warning' | 'critical';
}

export interface LocalLLMMemoryPolicy {
  maxActiveModels: number;
  idleUnloadMs: number;
  maxQueueDepthWhenSyncing: number;
  allowAggressivePreload: boolean;
}

export interface DesktopLLMService {
  listAvailableRuntimes(): Promise<DesktopLLMRuntimeDescriptor[]>;
  listManagedModels(): Promise<ManagedModelRecord[]>;
  downloadModel(modelId: string): Promise<ManagedModelRecord>;
  loadModel(modelId: string, runtimeId: DesktopLLMRuntimeId): Promise<{ loadedModelId: string; runtimeId: DesktopLLMRuntimeId }>;
  unloadModel(modelId: string): Promise<void>;
  runCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  runEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  getRuntimeHealth(): Promise<RuntimeHealth>;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_RUNTIMES: DesktopLLMRuntimeDescriptor[] = [
  {
    id: 'managed-local',
    displayName: 'Managed Local Model',
    priority: 1,
    availability: 'available',
    reason: null,
  },
  {
    id: 'apple-native',
    displayName: 'Apple Native Runtime',
    priority: 2,
    availability: 'degraded',
    reason: 'Enabled when macOS exposes Apple Intelligence on the current device.',
  },
  {
    id: 'remote-byok',
    displayName: 'Remote BYOK',
    priority: 3,
    availability: 'available',
    reason: 'Fallback runtime when local execution is unavailable.',
  },
];

const DEFAULT_MODELS: ManagedModelRecord[] = [
  {
    id: 'qwen3.5-0.8b-unsloth-q4',
    name: 'Qwen 3.5 0.8B Unsloth (Q4_K_M)',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    format: 'gguf',
    path: null,
    size: 562_036_672,
    contextLength: 8192,
    supportsEmbedding: false,
    supportsTools: true,
    status: 'ready',
  },
  {
    id: 'qwen3.5-2b-unsloth-q4',
    name: 'Qwen 3.5 2B Unsloth (Q4_K_M)',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    format: 'gguf',
    path: null,
    size: 1_353_293_824,
    contextLength: 8192,
    supportsEmbedding: false,
    supportsTools: true,
    status: 'ready',
  },
  {
    id: 'qwen3.5-4b-unsloth-q4',
    name: 'Qwen 3.5 4B Unsloth (Q4_K_M)',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    format: 'gguf',
    path: null,
    size: 2_899_560_448,
    contextLength: 8192,
    supportsEmbedding: false,
    supportsTools: true,
    status: 'ready',
  },
  {
    id: 'gemma-3n-e2b-q3',
    name: 'Gemma 3N E2B IT (Q3_K_M)',
    family: 'generic-instruct',
    quantization: 'Q3_K_M',
    format: 'gguf',
    path: null,
    size: 2_462_556_160,
    contextLength: 8192,
    supportsEmbedding: false,
    supportsTools: false,
    status: 'ready',
  },
  {
    id: 'nomic-embed-text-v1.5-q8_0',
    name: 'Nomic Embed Text v1.5 (Q8_0)',
    family: 'nomic',
    quantization: 'Q8_0',
    format: 'gguf',
    path: null,
    size: 327_155_712,
    contextLength: 2048,
    supportsEmbedding: true,
    supportsTools: false,
    status: 'ready',
  },
];

export const defaultDesktopLLMMemoryPolicy: LocalLLMMemoryPolicy = {
  maxActiveModels: 1,
  idleUnloadMs: 5 * 60 * 1000,
  maxQueueDepthWhenSyncing: 2,
  allowAggressivePreload: false,
};

// ============================================================================
// Bridge
// ============================================================================

interface DesktopLLMBridge {
  listAvailableRuntimes(): Promise<DesktopLLMRuntimeDescriptor[]>;
  listManagedModels(): Promise<ManagedModelRecord[]>;
  downloadModel(modelId: string): Promise<ManagedModelRecord>;
  loadModel(modelId: string, runtimeId: DesktopLLMRuntimeId): Promise<{ loadedModelId: string; runtimeId: DesktopLLMRuntimeId }>;
  unloadModel(modelId: string): Promise<void>;
  runCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  runEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  getRuntimeHealth(): Promise<RuntimeHealth>;
}

function isTauriRuntimeAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function createStaticDesktopLLMService(overrides?: Partial<{ runtimes: DesktopLLMRuntimeDescriptor[]; models: ManagedModelRecord[] }>): DesktopLLMService {
  const runtimes = overrides?.runtimes ?? DEFAULT_RUNTIMES;
  const models = overrides?.models ?? DEFAULT_MODELS;

  return {
    listAvailableRuntimes: async () => runtimes,
    listManagedModels: async () => models,
    downloadModel: async (modelId: string) => models.find(m => m.id === modelId) ?? models[0],
    loadModel: async (modelId: string, runtimeId: DesktopLLMRuntimeId) => ({ loadedModelId: modelId, runtimeId }),
    unloadModel: async () => {},
    runCompletion: async () => ({ text: '', tokensUsed: 0, modelId: models[0].id }),
    runEmbedding: async () => ({ embedding: [], tokensUsed: 0, modelId: models[1].id }),
    getRuntimeHealth: async () => ({
      status: 'healthy',
      loadedModelId: null,
      lastUnloadAt: null,
      queueDepth: 0,
      memoryPressure: 'normal' as const,
    }),
  };
}

function createTauriBridge(): DesktopLLMBridge {
  return {
    listAvailableRuntimes: () => invoke<DesktopLLMRuntimeDescriptor[]>('list_available_runtimes'),
    listManagedModels: () => invoke<ManagedModelRecord[]>('list_managed_models'),
    downloadModel: (modelId) => invoke<ManagedModelRecord>('download_model', { modelId }),
    loadModel: (modelId, runtimeId) =>
      invoke<{ loadedModelId: string; runtimeId: DesktopLLMRuntimeId }>('load_model', { modelId, runtimeId }),
    unloadModel: (modelId) => invoke<void>('unload_model', { modelId }),
    runCompletion: (request) => invoke<CompletionResponse>('run_completion', { request }),
    runEmbedding: (request) => invoke<EmbeddingResponse>('run_embedding', { request }),
    getRuntimeHealth: () => invoke<RuntimeHealth>('get_runtime_health'),
  };
}

function wrapBridge(bridge: DesktopLLMBridge): DesktopLLMService {
  return {
    listAvailableRuntimes: () => bridge.listAvailableRuntimes(),
    listManagedModels: () => bridge.listManagedModels(),
    downloadModel: (modelId) => bridge.downloadModel(modelId),
    loadModel: (modelId, runtimeId) => bridge.loadModel(modelId, runtimeId),
    unloadModel: (modelId) => bridge.unloadModel(modelId),
    runCompletion: (request) => bridge.runCompletion(request),
    runEmbedding: (request) => bridge.runEmbedding(request),
    getRuntimeHealth: () => bridge.getRuntimeHealth(),
  };
}

export function getDesktopLLMService(): DesktopLLMService {
  if (isTauriRuntimeAvailable()) {
    return wrapBridge(createTauriBridge());
  }

  return createStaticDesktopLLMService();
}

// ============================================================================
// Overview
// ============================================================================

export interface DesktopLLMOverview {
  runtimes: DesktopLLMRuntimeDescriptor[];
  models: ManagedModelRecord[];
  health: RuntimeHealth;
  memoryPolicy: LocalLLMMemoryPolicy;
}

export const DEFAULT_DESKTOP_LLM_OVERVIEW: DesktopLLMOverview = {
  runtimes: DEFAULT_RUNTIMES,
  models: DEFAULT_MODELS,
  health: {
    status: 'healthy',
    loadedModelId: null,
    lastUnloadAt: null,
    queueDepth: 0,
    memoryPressure: 'normal',
  },
  memoryPolicy: defaultDesktopLLMMemoryPolicy,
};

export async function getDesktopLLMOverview(): Promise<DesktopLLMOverview> {
  const service = getDesktopLLMService();
  const [runtimes, models, health] = await Promise.all([
    service.listAvailableRuntimes(),
    service.listManagedModels(),
    service.getRuntimeHealth(),
  ]);

  return {
    runtimes,
    models,
    health,
    memoryPolicy: defaultDesktopLLMMemoryPolicy,
  };
}
