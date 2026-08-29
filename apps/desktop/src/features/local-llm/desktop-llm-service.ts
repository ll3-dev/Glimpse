/**
 * Desktop LLM Service
 *
 * Provides local LLM runtime management for the desktop app.
 * Bridges TypeScript frontend with Tauri Rust backend for model
 * downloading, loading, inference, and file management.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { subscribeEvent } from '@rustra/tauri';
import { getDesktopModels, type LocalModelDefinition } from '@glimpse/shared';

// rustra 0.4.0 이벤트 계약 이름 — 채널은 rustraEventChannel() 규칙
// (`rustra://{name}`)으로 파생된다.
const DOWNLOAD_PROGRESS_EVENT = 'model:download-progress';
const DOWNLOAD_DONE_EVENT = 'model:download-done';

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

/**
 * Rust `src-tauri/src/models.rs`의 `EmbeddingRequest`(camelCase serde)와
 * 정확히 일치하는 와이어 형식. 데스크톱 bun 테스트
 * (`desktop-llm-service.test.ts`)가 이 계약을 고정한다.
 */
export interface EmbeddingRequestWire {
  runtimeId: string;
  modelId: string;
  input: string;
}

/** 서비스 수준 요청 — wire 형식으로 변환되기 전의 최소 입력. */
export interface EmbeddingRequest {
  text: string;
  modelId?: string;
  runtimeId?: string;
}

/**
 * Rust `EmbeddingResponse { vector: Vec<f32> }`와 일치. 과거 잘못된
 * `{ embedding, tokensUsed, modelId }` 타입은 런타임 실패를 은폐했었다.
 */
export interface EmbeddingResponse {
  vector: number[];
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
  runEmbeddingBatch(requests: EmbeddingRequestWire[]): Promise<EmbeddingResponse[]>;
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

// ============================================================================
// run_embedding IPC contract (tested in desktop-llm-service.test.ts)
// ============================================================================

export const DEFAULT_EMBEDDING_RUNTIME_ID = 'managed-local';
export const DEFAULT_EMBEDDING_MODEL_ID = 'default-embedding';

/**
 * Rust `EmbeddingRequest { runtime_id, model_id, input }`는
 * `#[serde(rename_all = "camelCase")]`라 와이어 키는 `runtimeId/modelId/input`
 * 이다. Rust 역직렬화는 불리는 쪽 필드가 필수이므로 누락 시 기본값을 채운다.
 */
export function buildEmbeddingInvokePayload(request: EmbeddingRequest): {
  request: EmbeddingRequestWire;
} {
  return {
    request: {
      runtimeId: request.runtimeId ?? DEFAULT_EMBEDDING_RUNTIME_ID,
      modelId: request.modelId ?? DEFAULT_EMBEDDING_MODEL_ID,
      input: request.text,
    },
  };
}

/** Rust 응답은 `{ vector }` 하나뿐이다 — legacy `{ embedding }`은 계약 위반. */
export function parseEmbeddingResponse(response: unknown): number[] {
  const vector = (response as { vector?: unknown } | null | undefined)?.vector;
  if (!Array.isArray(vector)) {
    throw new Error(
      'run_embedding response violated the TS↔Rust contract: expected { vector: number[] }',
    );
  }
  return vector;
}

/**
 * 배치 와이어 — Rust `Vec<EmbeddingRequest>`는 요청 배열 그대로, 명령 인자
 * 이름이 `requests`이므로 `{ requests: [...] }`로 감싼다.
 */
export function buildEmbeddingBatchInvokePayload(requests: EmbeddingRequestWire[]): {
  requests: EmbeddingRequestWire[];
} {
  return {
    // batch 입력은 이미 wire 형식(단건 builder의 출력과 동일)이다.
    requests: requests.map((request) => ({ ...request })),
  };
}

export function parseEmbeddingBatchResponse(response: unknown): number[][] {
  if (!Array.isArray(response)) {
    throw new Error(
      'run_embedding_batch response violated the TS↔Rust contract: expected { vector }[]',
    );
  }
  return response.map(parseEmbeddingResponse);
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
    runEmbedding: async () => ({ vector: [] }),
    // 정적 폴백에는 실추 벡터가 없다 — 빈 입력은 [], 그 외는 계약 위반처럼
    // 명확히 실패해 상위 폴백(키워드 순서)이 warn-once와 함께 동작하게 한다.
    runEmbeddingBatch: async (requests) => {
      if (requests.length === 0) return [];
      throw new Error('static desktop LLM service does not implement embeddings');
    },
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
    runEmbedding: async (request): Promise<EmbeddingResponse> => {
      const raw = await invoke<unknown>('run_embedding', buildEmbeddingInvokePayload(request));
      return { vector: parseEmbeddingResponse(raw) };
    },
    runEmbeddingBatch: async (requests): Promise<EmbeddingResponse[]> => {
      if (requests.length === 0) return [];
      const raw = await invoke<unknown[]>(
        'run_embedding_batch',
        buildEmbeddingBatchInvokePayload(requests),
      );
      return parseEmbeddingBatchResponse(raw).map((vector) => ({ vector }));
    },
    getRuntimeHealth: () => invoke<RuntimeHealth>('get_runtime_health'),
    // rustra 0.4.0 이벤트 계약 헬퍼 — 채널명/파싱은 @rustra/tauri 담당.
    onDownloadProgress: (callback) =>
      subscribeEvent<DownloadProgressEvent>(listen, DOWNLOAD_PROGRESS_EVENT, (payload) => callback(payload)),
    onDownloadDone: (callback) =>
      subscribeEvent<DownloadDoneEvent>(listen, DOWNLOAD_DONE_EVENT, (payload) => callback(payload)),
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
