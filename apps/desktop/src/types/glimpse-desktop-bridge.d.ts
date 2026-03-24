import type {
  CompletionRequest,
  CompletionResponse,
  DesktopLLMRuntimeDescriptor,
  DesktopLLMRuntimeId,
  EmbeddingRequest,
  EmbeddingResponse,
  ManagedModelRecord,
  RuntimeHealth,
} from '@glimpse/core/ai/runtime-registry';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    __GLIMPSE_DESKTOP_BRIDGE__?: {
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
    };
  }
}

export {};
