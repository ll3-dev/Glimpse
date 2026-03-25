import {
  createDefaultLocalLLMMemoryPolicy,
  createStaticDesktopLLMService,
  type CompletionRequest,
  type CompletionResponse,
  type DesktopLLMRuntimeDescriptor,
  type DesktopLLMRuntimeId,
  type DesktopLLMService,
  type EmbeddingRequest,
  type EmbeddingResponse,
  type LocalLLMMemoryPolicy,
  type ManagedModelRecord,
  type RuntimeHealth,
} from '@glimpse/core/ai/runtime-registry';
import { invoke } from '@tauri-apps/api/core';

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
    id: 'qwen2.5-3b-instruct-q4_k_m',
    name: 'Qwen 2.5 3B Instruct',
    family: 'qwen',
    quantization: 'Q4_K_M',
    format: 'gguf',
    path: null,
    size: 2_017_640_448,
    contextLength: 8192,
    supportsEmbedding: false,
    supportsTools: true,
    status: 'ready',
  },
  {
    id: 'nomic-embed-text-v1.5-q8_0',
    name: 'Nomic Embed Text v1.5',
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

const staticDesktopLLMService = createStaticDesktopLLMService({
  runtimes: DEFAULT_RUNTIMES,
  models: DEFAULT_MODELS,
});

export const defaultDesktopLLMMemoryPolicy = createDefaultLocalLLMMemoryPolicy();

interface DesktopLLMBridge {
  listAvailableRuntimes(): Promise<DesktopLLMRuntimeDescriptor[]>;
  listManagedModels(): Promise<ManagedModelRecord[]>;
  downloadModel(modelId: string): Promise<ManagedModelRecord>;
  loadModel(
    modelId: string,
    runtimeId: DesktopLLMRuntimeId
  ): Promise<{ loadedModelId: string; runtimeId: DesktopLLMRuntimeId }>;
  unloadModel(modelId: string): Promise<void>;
  runCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  runEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  getRuntimeHealth(): Promise<RuntimeHealth>;
}

function isTauriRuntimeAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function readDesktopBridge(): DesktopLLMBridge | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.__GLIMPSE_DESKTOP_BRIDGE__ ?? null;
}

function createTauriBridge(): DesktopLLMBridge {
  return {
    listAvailableRuntimes: () => invoke<DesktopLLMRuntimeDescriptor[]>('list_available_runtimes'),
    listManagedModels: () => invoke<ManagedModelRecord[]>('list_managed_models'),
    downloadModel: (modelId) => invoke<ManagedModelRecord>('download_model', { modelId }),
    loadModel: (modelId, runtimeId) =>
      invoke<{ loadedModelId: string; runtimeId: DesktopLLMRuntimeId }>('load_model', {
        modelId,
        runtimeId,
      }),
    unloadModel: (modelId) => invoke<void>('unload_model', { modelId }),
    runCompletion: (request) =>
      invoke<CompletionResponse>('run_completion', {
        request,
      }),
    runEmbedding: (request) =>
      invoke<EmbeddingResponse>('run_embedding', {
        request,
      }),
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
  const bridge = readDesktopBridge();
  if (bridge) {
    return wrapBridge(bridge);
  }

  if (isTauriRuntimeAvailable()) {
    return wrapBridge(createTauriBridge());
  }

  return staticDesktopLLMService;
}

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
