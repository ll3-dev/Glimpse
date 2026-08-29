import { beforeEach, describe, expect, test } from 'bun:test';
import { addLocalLLMModel, clearLocalLLMSettings } from '@/src/features/settings';
import { clearBYOKStoredSettings, setBYOKEnabled, setBYOKModel, setBYOKProvider, setBYOKApiKey } from '@/src/stores/settings/byok.store';
import {
  getAITargetSettings,
  resetAITargetSettings,
  setChatAITargetId,
  setDefaultAITargetId,
  setLabelingAITargetId,
  setMetadataAITargetId,
} from '@/src/stores/settings/ai-targets.store';
import {
  APPLE_TARGET_ID,
  createBYOKTargetId,
  createLocalTargetId,
  listSelectableTargets,
  parseAITargetId,
  resolveEffectiveTarget,
  RULES_TARGET_ID,
  STUB_TARGET_ID,
} from './index';

describe('ai target registry', () => {
  beforeEach(async () => {
    clearLocalLLMSettings();
    await clearBYOKStoredSettings();
    resetAITargetSettings();
  });

  test('parses and serializes local/byok target ids', () => {
    expect(parseAITargetId(createLocalTargetId('qwen3-4b'))).toEqual({
      kind: 'local',
      modelId: 'qwen3-4b',
      id: 'local.qwen3-4b',
    });

    expect(parseAITargetId(createBYOKTargetId('openai', 'gpt-4.1-mini'))).toEqual({
      kind: 'byok',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      id: 'byok.openai:gpt-4.1-mini',
    });
  });

  test('lists only ready local models as selectable targets', () => {
    addLocalLLMModel({ id: 'ready-model', name: 'Ready', family: 'qwen', size: 1_000_000_000, downloaded: true, isReady: true });
    addLocalLLMModel({ id: 'not-ready-model', name: 'Not Ready', family: 'qwen', size: 1_000_000_000, downloaded: false, isReady: false });

    const metadataTargets = listSelectableTargets('metadata');

    expect(metadataTargets.some((target) => target.id === createLocalTargetId('ready-model'))).toBe(true);
    expect(metadataTargets.some((target) => target.id === createLocalTargetId('not-ready-model'))).toBe(false);
  });

  test('lists only fully configured byok target as selectable', async () => {
    setBYOKProvider('openai');
    await setBYOKApiKey('sk-test');
    setBYOKModel('gpt-4.1-mini');
    setBYOKEnabled(true);

    const chatTargets = listSelectableTargets('chat');
    expect(chatTargets.some((target) => target.id === createBYOKTargetId('openai', 'gpt-4.1-mini'))).toBe(true);
  });

  test('resolves metadata/chat null settings from default target', () => {
    setDefaultAITargetId(STUB_TARGET_ID);
    setMetadataAITargetId(null);
    setChatAITargetId(null);

    expect(resolveEffectiveTarget('metadata').id).toBe(STUB_TARGET_ID);
    expect(resolveEffectiveTarget('chat').id).toBe(STUB_TARGET_ID);
  });

  test('keeps labeling target independent from default target', () => {
    setDefaultAITargetId(APPLE_TARGET_ID);
    setLabelingAITargetId(RULES_TARGET_ID);

    expect(resolveEffectiveTarget('labeling').id).toBe(RULES_TARGET_ID);
    expect(getAITargetSettings().defaultTargetId).toBe(APPLE_TARGET_ID);
  });
});
