export type AITargetId = string;
export type AIFeature = 'metadata' | 'labeling' | 'chat' | 'summary';

export type AITarget =
  | { kind: 'apple'; model: 'foundation-model'; id: AITargetId }
  | { kind: 'local'; modelId: string; id: AITargetId }
  | { kind: 'rules'; id: AITargetId }
  | { kind: 'stub'; id: AITargetId };

export interface AITargetSettings {
  defaultTargetId: AITargetId;
  metadataTargetId: AITargetId | null;
  labelingTargetId: AITargetId;
  chatTargetId: AITargetId | null;
  /** 오늘 요약 내러티브용 타깃 — null이면 default 타깃 승계. */
  summaryTargetId: AITargetId | null;
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

  return null;
}
