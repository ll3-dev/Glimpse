import { beforeEach, describe, expect, test } from 'bun:test';
import { addLocalLLMModel, clearLocalLLMSettings } from '@/src/features/settings';
import {
  getAITargetSettings,
  resetAITargetSettings,
  setChatAITargetId,
  setDefaultAITargetId,
  setLabelingAITargetId,
  setMetadataAITargetId,
  setSummaryAITargetId,
} from '@/src/stores/settings/ai-targets.store';
import {
  APPLE_TARGET_ID,
  createLocalTargetId,
  listSelectableTargets,
  parseAITargetId,
  resolveEffectiveTarget,
  resolveEffectiveTargetId,
  RULES_TARGET_ID,
  STUB_TARGET_ID,
} from './index';

describe('ai target registry', () => {
  beforeEach(() => {
    clearLocalLLMSettings();
    resetAITargetSettings();
  });

  test('parses and serializes local target ids', () => {
    expect(parseAITargetId(createLocalTargetId('qwen3-4b'))).toEqual({
      kind: 'local',
      modelId: 'qwen3-4b',
      id: 'local.qwen3-4b',
    });

    // 구 BYOK 타깃 id는 파싱 실패(null) — stub/rules 폴백으로 떨어진다
    expect(parseAITargetId('byok.openai:gpt-4.1-mini')).toBeNull();
  });

  test('lists only ready local models as selectable targets', () => {
    addLocalLLMModel({ id: 'ready-model', name: 'Ready', family: 'qwen', size: 1_000_000_000, downloaded: true, isReady: true });
    addLocalLLMModel({ id: 'not-ready-model', name: 'Not Ready', family: 'qwen', size: 1_000_000_000, downloaded: false, isReady: false });

    const metadataTargets = listSelectableTargets('metadata');

    expect(metadataTargets.some((target) => target.id === createLocalTargetId('ready-model'))).toBe(true);
    expect(metadataTargets.some((target) => target.id === createLocalTargetId('not-ready-model'))).toBe(false);
  });

  test('resolves metadata/chat null settings from default target', () => {
    setDefaultAITargetId(STUB_TARGET_ID);
    setMetadataAITargetId(null);
    setChatAITargetId(null);

    expect(resolveEffectiveTarget('metadata').id).toBe(STUB_TARGET_ID);
    expect(resolveEffectiveTarget('chat').id).toBe(STUB_TARGET_ID);
  });

  test('summary resolves from summaryTargetId, falling back to default', () => {
    setDefaultAITargetId(APPLE_TARGET_ID);
    expect(resolveEffectiveTarget('summary').kind).toBe('apple');

    // 로컬 모델이 없어 로컬 타깃을 쓸 수 없어도 id 해석은 설정을 따른다
    setSummaryAITargetId(createLocalTargetId('some-model'));
    expect(resolveEffectiveTargetId('summary')).toBe('local.some-model');
  });

  test('unsupported summary target falls back to stub — UI hides the paragraph', () => {
    setDefaultAITargetId(STUB_TARGET_ID);
    setSummaryAITargetId(null);

    expect(resolveEffectiveTarget('summary').kind).toBe('stub');
  });

  test('keeps labeling target independent from default target', () => {
    setDefaultAITargetId(APPLE_TARGET_ID);
    setLabelingAITargetId(RULES_TARGET_ID);

    expect(resolveEffectiveTarget('labeling').id).toBe(RULES_TARGET_ID);
    expect(getAITargetSettings().defaultTargetId).toBe(APPLE_TARGET_ID);
  });
});
