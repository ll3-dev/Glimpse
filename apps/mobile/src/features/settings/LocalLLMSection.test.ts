import { describe, expect, test } from 'bun:test';
import { canToggleLocalLLM, getLocalLLMToggleDisabledReason } from './localLLMToggle';
import type { LocalModel } from '@/src/features/core/application/state';

const readyModel: LocalModel = {
  id: 'ready-model',
  name: 'Ready Model',
  family: 'qwen',
  size: 1_000_000_000,
  downloaded: true,
  isReady: true,
};

describe('canToggleLocalLLM', () => {
  test('returns true when already enabled', () => {
    expect(canToggleLocalLLM(true, null, [])).toBe(true);
  });

  test('returns true when no model is selected', () => {
    expect(canToggleLocalLLM(false, null, [readyModel])).toBe(true);
  });

  test('returns true when selected model is not ready', () => {
    expect(
      canToggleLocalLLM(false, 'ready-model', [{ ...readyModel, isReady: false }])
    ).toBe(true);
  });

  test('returns true when selected model is ready even before enabling', () => {
    expect(canToggleLocalLLM(false, 'ready-model', [readyModel])).toBe(true);
  });
});

describe('getLocalLLMToggleDisabledReason', () => {
  test('returns null when no model is selected', () => {
    expect(getLocalLLMToggleDisabledReason(false, null, [readyModel])).toBeNull();
  });

  test('returns null when selected model is not ready', () => {
    expect(
      getLocalLLMToggleDisabledReason(false, 'ready-model', [{ ...readyModel, isReady: false }])
    ).toBeNull();
  });

  test('returns null when toggle is allowed', () => {
    expect(getLocalLLMToggleDisabledReason(false, 'ready-model', [readyModel])).toBeNull();
  });
});
