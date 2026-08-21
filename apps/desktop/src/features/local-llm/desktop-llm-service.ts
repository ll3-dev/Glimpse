/**
 * Desktop LLM Service
 *
 * Provides local LLM runtime management for the desktop app.
 * Bridges TypeScript frontend with Tauri Rust backend for model
 * downloading, loading, inference, and file management.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getDesktopModels, type LocalModelDefinition } from '@glimpse/shared';

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

/**
 * shared 레지스트리(packages/shared LOCAL_MODEL_REGISTRY)에서 파생 —
 * 이 파일에 별도 하드코딩 목록을 유지하면 Rust models.rs 와 어긋난다
 * (과거 4개만 있어 ministral 누락).
 */
function toManagedRecord(def: LocalModelDefinition): ManagedModelRecord {
  return {
    id: def.id,
    name: `${def.name} (${def.quantization})`,
    family: def.family,
    quantization: def.quantization,
    format: 'gguf',
    repo: def.repo,
    filename: def.filename,
    path: null,
    size: def.sizeBytes,
    contextLength: def.contextLength,
    supportsEmbedding: def.capabilities.includes('embedding'),
    supportsTools: def.capabilities.includes('tools'),
    status: 'not_downloaded',
  };
}

function getDefaultModels(): ManagedModelRecord[] {
  return getDesktopModels().map(toManagedRecord);
}

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
  const models = getDefaultModels();

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
