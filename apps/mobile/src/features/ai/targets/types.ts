import type { BYOKProviderType } from '@/src/features/settings/byok.types';

export type AITargetId = string;
export type AIFeature = 'metadata' | 'labeling' | 'chat';

export type AITarget =
  | { kind: 'apple'; model: 'foundation-model'; id: AITargetId }
  | { kind: 'local'; modelId: string; id: AITargetId }
  | { kind: 'byok'; provider: BYOKProviderType; model: string; id: AITargetId }
  | { kind: 'rules'; id: AITargetId }
  | { kind: 'stub'; id: AITargetId };

export interface AITargetSettings {
  defaultTargetId: AITargetId;
  metadataTargetId: AITargetId | null;
  labelingTargetId: AITargetId;
  chatTargetId: AITargetId | null;
}

export interface AITargetDescriptor {
  id: AITargetId;
  label: string;
  description: string;
  kind: AITarget['kind'];
  available: boolean;
  featureSupport: AIFeature[];
}

export const STUB_TARGET_ID = 'stub.default';
export const RULES_TARGET_ID = 'rules.default';
export const APPLE_TARGET_ID = 'apple.foundation-model';

export function createLocalTargetId(modelId: string): AITargetId {
  return `local.${modelId}`;
}

export function createBYOKTargetId(provider: BYOKProviderType, model: string): AITargetId {
  return `byok.${provider}:${model}`;
}

export function parseAITargetId(id: AITargetId): AITarget | null {
  if (id === APPLE_TARGET_ID) {
    return { kind: 'apple', model: 'foundation-model', id };
  }

  if (id === RULES_TARGET_ID) {
    return { kind: 'rules', id };
  }

  if (id === STUB_TARGET_ID) {
    return { kind: 'stub', id };
  }

  if (id.startsWith('local.')) {
    const modelId = id.slice('local.'.length);
    return modelId ? { kind: 'local', modelId, id } : null;
  }

  if (id.startsWith('byok.')) {
    const value = id.slice('byok.'.length);
    const separatorIndex = value.indexOf(':');
    if (separatorIndex <= 0) {
      return null;
    }

    const provider = value.slice(0, separatorIndex) as BYOKProviderType;
    const model = value.slice(separatorIndex + 1);
    if (!model) {
      return null;
    }

    return { kind: 'byok', provider, model, id };
  }

  return null;
}
