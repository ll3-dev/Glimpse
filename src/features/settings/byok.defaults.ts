import type { BYOKProviderType } from './byok.types';
import { BYOK_MODEL_REGISTRY } from './byok.model-registry';

export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

export const DEFAULT_BYOK_MODELS: Record<BYOKProviderType, string> = {
  ...BYOK_MODEL_REGISTRY.selection.defaultModelByProvider,
};

export function getDefaultByokModel(provider: BYOKProviderType): string {
  return DEFAULT_BYOK_MODELS[provider];
}

export function isPreviewModelAllowed(): boolean {
  return BYOK_MODEL_REGISTRY.selection.allowPreview;
}

export function isAppOnlyModelRegistry(): boolean {
  return (
    BYOK_MODEL_REGISTRY.runtime.scope === 'app_only' &&
    BYOK_MODEL_REGISTRY.runtime.externalUseAllowed === false
  );
}

export function isPreviewModel(modelId: string): boolean {
  const normalized = modelId.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const popularMatch = BYOK_MODEL_REGISTRY.popular.some(
    (model) => model.id.toLowerCase() === normalized && model.isPreview
  );
  return popularMatch || normalized.includes('preview');
}

export function normalizeBaseUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}
