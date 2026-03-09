import { describe, expect, test } from 'bun:test';
import { canToggleLocalLLM, getLocalLLMToggleDisabledReason } from './localLLMToggle';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';

const readyModel: LocalModel = {
  id: 'ready-model',
  name: 'Ready Model',
  isReady: true,
};

describe('canToggleLocalLLM', () => {
  test('returns true when already enabled', () => {
    expect(canToggleLocalLLM(true, null, [])).toBe(true);
  });

  test('returns false when no model is selected', () => {
    expect(canToggleLocalLLM(false, null, [readyModel])).toBe(false);
  });

  test('returns false when selected model is not ready', () => {
    expect(
      canToggleLocalLLM(false, 'ready-model', [{ ...readyModel, isReady: false }])
    ).toBe(false);
  });

  test('returns true when selected model is ready even before enabling', () => {
    expect(canToggleLocalLLM(false, 'ready-model', [readyModel])).toBe(true);
  });
});

describe('getLocalLLMToggleDisabledReason', () => {
  test('returns a reason when no model is selected', () => {
    expect(getLocalLLMToggleDisabledReason(false, null, [readyModel])).toContain('모델');
  });

  test('returns a reason when selected model is not ready', () => {
    expect(
      getLocalLLMToggleDisabledReason(false, 'ready-model', [{ ...readyModel, isReady: false }])
    ).toContain('다운로드');
  });

  test('returns null when toggle is allowed', () => {
    expect(getLocalLLMToggleDisabledReason(false, 'ready-model', [readyModel])).toBeNull();
  });
});
