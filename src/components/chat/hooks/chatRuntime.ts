import { createLocalLLMRuntime, type LocalLLMRuntime } from '@/src/features/ai/local-llm';
import { createLlamaService, type LlamaService } from '@/src/features/ai/llama-service';
import {
  clearLocalLLMLoadError,
  failLocalLLMLoading,
  finishLocalLLMLoading,
  startLocalLLMLoading,
  updateLocalLLMLoadProgress,
} from '@/src/stores/settings/local-llm.store';

const RUNTIME_SINGLETON_KEY = '__glimpse_local_llm_runtime__';

type GlobalWithRuntime = typeof globalThis & {
  [RUNTIME_SINGLETON_KEY]?: LocalLLMRuntime;
};

export function getLocalLLMRuntime(): LocalLLMRuntime {
  const globalScope = globalThis as GlobalWithRuntime;

  if (!globalScope[RUNTIME_SINGLETON_KEY]) {
    const service = createTrackedLlamaService();
    globalScope[RUNTIME_SINGLETON_KEY] = createLocalLLMRuntime(service);
  }

  return globalScope[RUNTIME_SINGLETON_KEY]!;
}

function createTrackedLlamaService(): LlamaService {
  const service = createLlamaService();

  return {
    ...service,
    async loadModel(modelPath, options) {
      clearLocalLLMLoadError();
      startLocalLLMLoading();

      try {
        await service.loadModel(modelPath, {
          ...options,
          onProgress(progress) {
            updateLocalLLMLoadProgress(progress);
            options?.onProgress?.(progress);
          },
        });
        finishLocalLLMLoading();
      } catch (error) {
        const message = error instanceof Error ? error.message : '모델 로딩에 실패했습니다.';
        failLocalLLMLoading(message);
        throw error;
      }
    },
  };
}
