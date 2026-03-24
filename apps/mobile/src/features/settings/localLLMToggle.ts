import type { LocalModel } from '@/src/stores/settings/local-llm.store';

export function canToggleLocalLLM(
  enabled: boolean,
  selectedModelId: string | null,
  availableModels: LocalModel[]
): boolean {
  void enabled;
  void selectedModelId;
  void availableModels;
  return true;
}

export function getLocalLLMToggleDisabledReason(
  enabled: boolean,
  selectedModelId: string | null,
  availableModels: LocalModel[]
): string | null {
  void enabled;
  void selectedModelId;
  void availableModels;
  return null;
}
