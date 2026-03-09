import type { LocalModel } from '@/src/stores/settings/local-llm.store';

export function canToggleLocalLLM(
  enabled: boolean,
  selectedModelId: string | null,
  availableModels: LocalModel[]
): boolean {
  if (enabled) {
    return true;
  }

  if (!selectedModelId) {
    return false;
  }

  return availableModels.some((model) => model.id === selectedModelId && model.isReady);
}

export function getLocalLLMToggleDisabledReason(
  enabled: boolean,
  selectedModelId: string | null,
  availableModels: LocalModel[]
): string | null {
  if (enabled) {
    return null;
  }

  if (!selectedModelId) {
    return '로컬 LLM을 사용하려면 먼저 모델을 다운로드하고 선택해주세요.';
  }

  const selectedModel = availableModels.find((model) => model.id === selectedModelId);
  if (!selectedModel?.isReady) {
    return '선택한 모델 다운로드가 완료된 뒤에 로컬 LLM을 켤 수 있습니다.';
  }

  return null;
}
