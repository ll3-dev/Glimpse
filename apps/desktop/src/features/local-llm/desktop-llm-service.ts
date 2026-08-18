/**
 * Desktop LLM Service
 *
 * Provides local LLM runtime management for the desktop app.
 * Bridges TypeScript frontend with Tauri Rust backend for model
 * downloading, loading, inference, and file management.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// ============================================================================
// Types
// ============================================================================

export interface DesktopLLMRuntimeDescriptor {
  id: string;
  displayName: string;
  priority: number;
  availability: 'available' | 'degraded' | 'unavailable';
  reason: string | null;
}

export type DesktopLLMRuntimeId = string;

export type ModelDownloadStatus =
  | 'not_downloaded'
  | 'downloading'
  | 'download_failed'
  | 'ready'
  | 'active';

export interface ManagedModelRecord {
  id: string;
  name: string;
  family: string;
  quantization: string;
  format: string;
  repo: string;
  filename: string;
  path: string | null;
  size: number;
  contextLength: number;
  supportsEmbedding: boolean;
  supportsTools: boolean;
  status: ModelDownloadStatus;
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

export interface DownloadProgressEvent {
  modelId: string;
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
}

export interface DownloadDoneEvent {
  modelId: string;
  path: string;
}

export interface DesktopLLMService {
  listAvailableRuntimes(): Promise<DesktopLLMRuntimeDescriptor[]>;
  listManagedModels(): Promise<ManagedModelRecord[]>;
  downloadModel(modelId: string): Promise<ManagedModelRecord>;
  deleteModel(modelId: string): Promise<void>;
  loadModel(modelId: string, runtimeId: DesktopLLMRuntimeId): Promise<{ loadedModelId: string; runtimeId: DesktopLLMRuntimeId }>;
  unloadModel(modelId: string): Promise<void>;
  runCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  runEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  getRuntimeHealth(): Promise<RuntimeHealth>;
  onDownloadProgress(callback: (event: DownloadProgressEvent) => void): Promise<() => void>;
  onDownloadDone(callback: (event: DownloadDoneEvent) => void): Promise<() => void>;
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
    id: 'qwen3.5-0.8b-q4',
    name: 'Qwen 3.5 0.8B (Q4_K_M)',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    format: 'gguf',
    repo: 'unsloth/Qwen3.5-0.8B-GGUF',
    filename: 'Qwen3.5-0.8B-Q4_K_M.gguf',
    path: null,
    size: 536_870_912,
    contextLength: 262_144,
    supportsEmbedding: false,
    supportsTools: true,
    status: 'not_downloaded',
  },
  {
    id: 'qwen3.5-2b-q4',
    name: 'Qwen 3.5 2B (Q4_K_M)',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    format: 'gguf',
    repo: 'unsloth/Qwen3.5-2B-GGUF',
    filename: 'Qwen3.5-2B-Q4_K_M.gguf',
    path: null,
    size: 1_277_802_496,
    contextLength: 262_144,
    supportsEmbedding: false,
    supportsTools: true,
    status: 'not_downloaded',
  },
  {
    id: 'qwen3.5-4b-q4',
    name: 'Qwen 3.5 4B (Q4_K_M)',
    family: 'qwen-chatml',
    quantization: 'Q4_K_M',
    format: 'gguf',
    repo: 'unsloth/Qwen3.5-4B-GGUF',
    filename: 'Qwen3.5-4B-Q4_K_M.gguf',
    path: null,
    size: 2_738_398_208,
    contextLength: 262_144,
    supportsEmbedding: false,
    supportsTools: true,
    status: 'not_downloaded',
  },
  {
    id: 'nomic-embed-text-v1.5-q8_0',
    name: 'Nomic Embed v1.5 (Q8_0)',
    family: 'nomic',
    quantization: 'Q8_0',
    format: 'gguf',
    repo: 'nomic-ai/nomic-embed-text-v1.5-GGUF',
    filename: 'nomic-embed-text-v1.5.Q8_0.gguf',
    path: null,
    size: 327_155_712,
    contextLength: 8_192,
    supportsEmbedding: true,
    supportsTools: false,
    status: 'not_downloaded',
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

function isTauriRuntimeAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function createStaticDesktopLLMService(): DesktopLLMService {
  const models = DEFAULT_MODELS;

  return {
    listAvailableRuntimes: async () => DEFAULT_RUNTIMES,
    listManagedModels: async () => models,
    downloadModel: async (modelId: string) => {
      const model = models.find(m => m.id === modelId);
      if (model) {
        model.status = 'ready';
        model.path = `~/Library/Application Support/com.glimpse.desktop/models/${modelId}.gguf`;
      }
      return model ?? models[0];
    },
    deleteModel: async (modelId: string) => {
      const model = models.find(m => m.id === modelId);
      if (model) {
        model.status = 'not_downloaded';
        model.path = null;
      }
    },
    loadModel: async (modelId: string, runtimeId: DesktopLLMRuntimeId) => {
      const model = models.find(m => m.id === modelId);
      if (model) model.status = 'active';
      return { loadedModelId: modelId, runtimeId };
    },
    unloadModel: async (modelId: string) => {
      const model = models.find(m => m.id === modelId);
      if (model && model.status === 'active') model.status = 'ready';
    },
    runCompletion: async () => ({ text: '', tokensUsed: 0, modelId: models[0].id }),
    runEmbedding: async () => ({ embedding: [], tokensUsed: 0, modelId: models[3].id }),
    getRuntimeHealth: async () => ({
      status: 'healthy',
      loadedModelId: null,
      lastUnloadAt: null,
      queueDepth:  0,
      memoryPressure: 'normal' as const,
    }),
    onDownloadProgress: async () => () => {},
    onDownloadDone: async () => () => {},
  };
}

function createTauriBridge(): DesktopLLMService {
  return {
    listAvailableRuntimes: () => invoke<DesktopLLMRuntimeDescriptor[]>('list_available_runtimes'),
    listManagedModels: () => invoke<ManagedModelRecord[]>('list_managed_models'),
    downloadModel: (modelId) => invoke<ManagedModelRecord>('download_model', { modelId }),
    deleteModel: (modelId) => invoke<void>('delete_model', { modelId }),
    loadModel: (modelId, runtimeId) =>
      invoke<{ loadedModelId: string; runtimeId: DesktopLLMRuntimeId }>('load_model', { modelId, runtimeId }),
    unloadModel: (modelId) => invoke<void>('unload_model', { modelId }),
    runCompletion: (request) => invoke<CompletionResponse>('run_completion', { request }),
    runEmbedding: (request) => invoke<EmbeddingResponse>('run_embedding', { request }),
    getRuntimeHealth: () => invoke<RuntimeHealth>('get_runtime_health'),
    onDownloadProgress: (callback) =>
      listen<DownloadProgressEvent>('rustra://model:download-progress', (e) => callback(e.payload)),
    onDownloadDone: (callback) =>
      listen<DownloadDoneEvent>('rustra://model:download-done', (e) => callback(e.payload)),
  };
}

export function getDesktopLLMService(): DesktopLLMService {
  if (isTauriRuntimeAvailable()) {
    return createTauriBridge();
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
