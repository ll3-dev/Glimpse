import { checkAppleIntelligenceAvailability } from '@/src/features/settings/appleIntelligenceToggle';
import { getBYOKStoreConfig } from '@/src/stores/settings/byok.store';
import { getAvailableLocalModels } from '@/src/features/settings/local-llm.selectors';
import { getAITargetSettings } from '@/src/stores/settings/ai-targets.store';
import {
  APPLE_TARGET_ID,
  createBYOKTargetId,
  createLocalTargetId,
  parseAITargetId,
  RULES_TARGET_ID,
  STUB_TARGET_ID,
  type AIFeature,
  type AITarget,
  type AITargetDescriptor,
  type AITargetId,
} from './types';

export function listAvailableAITargets(): AITargetDescriptor[] {
  const appleAvailability = checkAppleIntelligenceAvailability();
  const localModels = getAvailableLocalModels();
  const byokConfig = getBYOKStoreConfig();

  const descriptors: AITargetDescriptor[] = [
    {
      id: STUB_TARGET_ID,
      label: '기본 자동 정리',
      description: '온디바이스 미리보기와 규칙 기반 태그',
      kind: 'stub',
      available: true,
      featureSupport: ['metadata', 'labeling'],
    },
    {
      id: RULES_TARGET_ID,
      label: 'Rules',
      description: '규칙 기반 라벨링',
      kind: 'rules',
      available: true,
      featureSupport: ['labeling'],
    },
    {
      id: APPLE_TARGET_ID,
      label: 'Apple Intelligence',
      description: 'Apple 온디바이스 모델',
      kind: 'apple',
      available: appleAvailability.available,
      featureSupport: ['metadata', 'labeling'],
    },
  ];

  for (const model of localModels) {
    descriptors.push({
      id: createLocalTargetId(model.id),
      label: `Local: ${model.name}`,
      description: '다운로드된 로컬 모델',
      kind: 'local',
      available: model.isReady === true,
      featureSupport: ['metadata', 'labeling', 'chat'],
    });
  }

  if (
    byokConfig.enabled &&
    byokConfig.provider &&
    byokConfig.apiKey &&
    byokConfig.model
  ) {
    descriptors.push({
      id: createBYOKTargetId(byokConfig.provider, byokConfig.model),
      label: `BYOK: ${byokConfig.provider} / ${byokConfig.model}`,
      description: '외부 API 기반 모델',
      kind: 'byok',
      available: true,
      featureSupport: ['metadata', 'labeling', 'chat'],
    });
  }

  return descriptors;
}

export function listSelectableTargets(feature: AIFeature): AITargetDescriptor[] {
  return listAvailableAITargets().filter(
    (target) => target.available && target.featureSupport.includes(feature)
  );
}

export function isTargetSupportedForFeature(target: AITarget, feature: AIFeature): boolean {
  switch (target.kind) {
    case 'apple':
      return feature === 'metadata' || feature === 'labeling';
    case 'local':
    case 'byok':
      return true;
    case 'stub':
      return feature !== 'chat';
    case 'rules':
      return feature === 'labeling';
  }
}

export function resolveEffectiveTargetId(feature: AIFeature): AITargetId {
  const settings = getAITargetSettings();

  switch (feature) {
    case 'metadata':
      return settings.metadataTargetId ?? settings.defaultTargetId;
    case 'chat':
      return settings.chatTargetId ?? settings.defaultTargetId;
    case 'labeling':
      return settings.labelingTargetId;
  }
}

export function resolveEffectiveTarget(feature: AIFeature): AITarget {
  const targetId = resolveEffectiveTargetId(feature);
  const target = parseAITargetId(targetId);

  if (target && isTargetSupportedForFeature(target, feature)) {
    return target;
  }

  if (feature === 'labeling') {
    return parseAITargetId(RULES_TARGET_ID)!;
  }

  return parseAITargetId(STUB_TARGET_ID)!;
}
