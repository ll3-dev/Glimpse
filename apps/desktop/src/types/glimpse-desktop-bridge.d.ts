/**
 * Global window bridge types for the Tauri desktop shell.
 *
 * 과거 이 파일은 삭제된 `@glimpse/core/ai/runtime-registry` 모듈에서 타입을
 * 가져왔다(skipLibCheck 은폐 하의 데드 참조). 실제 출처인
 * `features/local-llm/desktop-llm-service`에서 재수출한 타입으로 대체했다.
 */
import type {
  CompletionRequest,
  CompletionResponse,
  DesktopLLMRuntimeDescriptor,
  DesktopLLMRuntimeId,
  EmbeddingRequest,
  EmbeddingResponse,
  ManagedModelRecord,
  RuntimeHealth,
} from '@/features/local-llm/desktop-llm-service';

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
