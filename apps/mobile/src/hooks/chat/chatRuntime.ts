import {
  getSharedLocalLLMRuntime,
  type LocalLLMRuntime,
} from '@/src/features/ai/local-llm';

export function getLocalLLMRuntime(): LocalLLMRuntime {
  return getSharedLocalLLMRuntime();
}
