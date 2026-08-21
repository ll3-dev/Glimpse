import {
  clearBYOKStoredSettings,
  getBYOKStoreConfig,
  setBYOKApiKey,
  setBYOKBaseUrl,
  setBYOKEnabled,
  setBYOKModel,
  setBYOKProvider,
  type BYOKProviderType,
} from '@/src/stores/settings/byok.store';
import {
  DEFAULT_OPENAI_BASE_URL,
  getDefaultByokModel,
  isPreviewModel,
  isPreviewModelAllowed,
  normalizeBaseUrl,
} from './byok.defaults';
import { validateApiKey } from './byok.validation';
import type { ValidationResult } from './byok.types';

export function enableBYOK(): ValidationResult {
  const config = getBYOKStoreConfig();

  if (!config.apiKey) {
    return { valid: false, error: 'API 키를 먼저 설정해주세요' };
  }

  if (!config.provider) {
    return { valid: false, error: 'Provider를 선택해주세요' };
  }

  setBYOKEnabled(true);
  return { valid: true };
}

export function disableBYOK(): void {
  setBYOKEnabled(false);
}

export async function setProvider(provider: BYOKProviderType | null): Promise<void> {
  const previous = getBYOKStoreConfig();

  if (!provider) {
    await setBYOKApiKey(null);
    setBYOKProvider(null);
    setBYOKEnabled(false);
    setBYOKModel(null);
    setBYOKBaseUrl(null);
    return;
  }

  if (previous.provider !== null && previous.provider !== provider) {
    await setBYOKApiKey(null);
    setBYOKEnabled(false);
  }

  setBYOKProvider(provider);

  setBYOKModel(getDefaultByokModel(provider));

  if (provider === 'openai') {
    const currentBaseUrl = normalizeBaseUrl(getBYOKStoreConfig().baseUrl);
    setBYOKBaseUrl(currentBaseUrl ?? DEFAULT_OPENAI_BASE_URL);
    return;
  }

  setBYOKBaseUrl(null);
}

export async function setApiKey(
  provider: BYOKProviderType,
  apiKey: string,
): Promise<ValidationResult> {
  const trimmedKey = apiKey.trim();
  const configuredBaseUrl = normalizeBaseUrl(getBYOKStoreConfig().baseUrl);
  const allowLooseOpenAIKeyFormat =
    provider === 'openai' &&
    configuredBaseUrl !== null &&
    configuredBaseUrl !== DEFAULT_OPENAI_BASE_URL;
  const validation = validateApiKey(trimmedKey, provider, {
    allowLooseFormat: allowLooseOpenAIKeyFormat,
  });

  if (!validation.valid) {
    return validation;
  }

  await setBYOKApiKey(trimmedKey);
  setBYOKProvider(provider);

  return { valid: true };
}

export function setBaseUrl(baseUrl: string): ValidationResult {
  const normalized = normalizeBaseUrl(baseUrl);

  if (!normalized) {
    setBYOKBaseUrl(null);
    return { valid: true };
  }

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Base URL은 http/https만 지원됩니다' };
    }
  } catch {
    return { valid: false, error: '유효한 Base URL을 입력해주세요' };
  }

  setBYOKBaseUrl(normalized);
  return { valid: true };
}

export function setModel(model: string): ValidationResult {
  const trimmed = model.trim();
  if (!trimmed) {
    setBYOKModel(null);
    return { valid: true };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: '모델 이름이 너무 짧습니다' };
  }

  if (isPreviewModel(trimmed) && !isPreviewModelAllowed()) {
    return { valid: false, error: 'Preview 모델은 현재 비활성화되어 있습니다' };
  }

  setBYOKModel(trimmed);
  return { valid: true };
}

export async function clearApiKey(): Promise<void> {
  await clearBYOKStoredSettings();
}
