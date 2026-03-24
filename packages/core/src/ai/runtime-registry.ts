export const DESKTOP_LLM_RUNTIME_IDS = [
  'managed-local',
  'apple-native',
  'remote-byok',
] as const;

export type DesktopLLMRuntimeId = (typeof DESKTOP_LLM_RUNTIME_IDS)[number];

export type ManagedModelFormat = 'gguf';

export type ManagedModelStatus =
  | 'not-downloaded'
  | 'downloading'
  | 'ready'
  | 'loading'
  | 'active'
  | 'broken';

export type RuntimeAvailability = 'available' | 'unavailable' | 'degraded';

export type RuntimeHealthStatus = 'healthy' | 'degraded' | 'offline';

export interface ManagedModelRecord {
  id: string;
  name: string;
  family: string;
  quantization: string;
  format: ManagedModelFormat;
  path: string | null;
  size: number;
  contextLength: number;
  supportsEmbedding: boolean;
  supportsTools: boolean;
  status: ManagedModelStatus;
}

export interface DesktopLLMRuntimeDescriptor {
  id: DesktopLLMRuntimeId;
  displayName: string;
  priority: number;
  availability: RuntimeAvailability;
  reason: string | null;
}

export interface CompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  runtimeId: DesktopLLMRuntimeId;
  modelId: string;
  messages: CompletionMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResponse {
  text: string;
  stopReason: 'completed' | 'length' | 'unavailable';
}

export interface EmbeddingRequest {
  runtimeId: DesktopLLMRuntimeId;
  modelId: string;
  input: string;
}

export interface EmbeddingResponse {
  vector: number[];
}

export interface RuntimeHealth {
  status: RuntimeHealthStatus;
  loadedModelId: string | null;
  lastUnloadAt: number | null;
  queueDepth: number;
  memoryPressure: 'normal' | 'elevated' | 'critical';
}

export interface LocalLLMMemoryPolicy {
  maxActiveModels: number;
  idleUnloadMs: number;
  allowAggressivePreload: boolean;
  maxQueueDepthWhenSyncing: number;
}

export interface DesktopLLMService {
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

export function createDefaultLocalLLMMemoryPolicy(): LocalLLMMemoryPolicy {
  return {
    maxActiveModels: 1,
    idleUnloadMs: 5 * 60 * 1000,
    allowAggressivePreload: false,
    maxQueueDepthWhenSyncing: 1,
  };
}

function cloneModel(model: ManagedModelRecord): ManagedModelRecord {
  return { ...model };
}

export function createStaticDesktopLLMService(config: {
  runtimes: DesktopLLMRuntimeDescriptor[];
  models: ManagedModelRecord[];
  health?: RuntimeHealth;
}): DesktopLLMService {
  let models = config.models.map(cloneModel);
  let health: RuntimeHealth = config.health ?? {
    status: 'healthy',
    loadedModelId: models.find((model) => model.status === 'active')?.id ?? null,
    lastUnloadAt: null,
    queueDepth: 0,
    memoryPressure: 'normal',
  };

  return {
    async listAvailableRuntimes() {
      return config.runtimes.map((runtime) => ({ ...runtime }));
    },

    async listManagedModels() {
      return models.map(cloneModel);
    },

    async downloadModel(modelId) {
      const model = models.find((candidate) => candidate.id === modelId);
      if (!model) {
        throw new Error(`Managed model not found: ${modelId}`);
      }

      model.status = 'ready';
      model.path ??= `~/Library/Application Support/Glimpse/models/${model.id}.gguf`;
      return cloneModel(model);
    },

    async loadModel(modelId, runtimeId) {
      models = models.map((model) => {
        if (model.id === modelId) {
          return { ...model, status: 'active' };
        }
        return model.status === 'active' ? { ...model, status: 'ready' } : model;
      });

      health = {
        ...health,
        status: runtimeId === 'remote-byok' ? 'degraded' : 'healthy',
        loadedModelId: modelId,
      };

      return { loadedModelId: modelId, runtimeId };
    },

    async unloadModel(modelId) {
      models = models.map((model) =>
        model.id === modelId && model.status === 'active'
          ? { ...model, status: 'ready' }
          : model
      );
      if (health.loadedModelId === modelId) {
        health = {
          ...health,
          loadedModelId: null,
          lastUnloadAt: Date.now(),
        };
      }
    },

    async runCompletion(request) {
      const prompt = request.messages[request.messages.length - 1]?.content ?? '';
      return {
        text: `[${request.runtimeId}] ${request.modelId}: ${prompt}`,
        stopReason: 'completed',
      };
    },

    async runEmbedding(request) {
      const base = request.input.length || 1;
      return {
        vector: [base, base / 2, base / 4],
      };
    },

    async getRuntimeHealth() {
      return { ...health };
    },
  };
}
