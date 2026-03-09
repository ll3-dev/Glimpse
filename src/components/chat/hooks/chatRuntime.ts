import { createLocalLLMRuntime, type LocalLLMRuntime } from '@/src/features/ai/local-llm';

let localLLMRuntime: LocalLLMRuntime | null = null;

export function getLocalLLMRuntime(): LocalLLMRuntime {
  if (!localLLMRuntime) {
    localLLMRuntime = createLocalLLMRuntime();
  }

  return localLLMRuntime;
}
