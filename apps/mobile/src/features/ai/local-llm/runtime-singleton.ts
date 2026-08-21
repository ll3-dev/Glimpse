import { createLlamaService, type LlamaService } from '../llama-service';
import {
  clearLocalLLMLoadError,
  failLocalLLMLoading,
  finishLocalLLMLoading,
  startLocalLLMLoading,
  updateLocalLLMLoadProgress,
} from '@/src/stores/settings/local-llm.store';
import { createLocalLLMRuntime, type LocalLLMRuntime } from './runtime';

const RUNTIME_SINGLETON_KEY = '__glimpse_local_llm_runtime__';

type GlobalWithRuntime = typeof globalThis & {
  [RUNTIME_SINGLETON_KEY]?: LocalLLMRuntime;
};

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

export function getSharedLocalLLMRuntime(): LocalLLMRuntime {
  const globalScope = globalThis as GlobalWithRuntime;
  globalScope[RUNTIME_SINGLETON_KEY] ??= createLocalLLMRuntime(createTrackedLlamaService());
  return globalScope[RUNTIME_SINGLETON_KEY];
}

export async function unloadSharedLocalLLM(): Promise<void> {
  const runtime = (globalThis as GlobalWithRuntime)[RUNTIME_SINGLETON_KEY];
  if (runtime?.isModelLoaded()) {
    await runtime.unloadModel();
  }
}
