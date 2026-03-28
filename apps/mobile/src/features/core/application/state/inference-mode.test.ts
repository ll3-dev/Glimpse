import { describe, expect, test } from 'bun:test';
import {
  activateInferenceModeSnapshot,
  createInferenceModeSnapshot,
  getInferenceProviderFromMode,
  resetInferenceModeSnapshot,
  syncInferenceModeSnapshot,
  type InferenceModeStoreState,
} from './inference-mode';

const baseState = (): InferenceModeStoreState => ({
  ...createInferenceModeSnapshot(),
  actions: {
    activate: () => ({ success: true }),
    reset: () => {},
    sync: () => {},
  },
});

describe('inference mode snapshots', () => {
  test('creates and resets to local mode with all providers unavailable', () => {
    expect(createInferenceModeSnapshot()).toEqual({
      activeMode: 'local',
      availability: {
        appleIntelligence: false,
        localLLM: false,
        byok: false,
      },
    });
    expect(resetInferenceModeSnapshot()).toEqual(createInferenceModeSnapshot());
  });

  test('rejects activation when requested mode is unavailable', () => {
    expect(activateInferenceModeSnapshot(baseState(), 'apple')).toEqual({
      success: false,
      error: 'Apple Intelligence not available',
    });
    expect(activateInferenceModeSnapshot(baseState(), 'local')).toEqual({
      success: false,
      error: 'Local LLM not available',
    });
    expect(activateInferenceModeSnapshot(baseState(), 'byok')).toEqual({
      success: false,
      error: 'BYOK not configured',
    });
  });

  test('activates mode when provided availability allows it', () => {
    const state = baseState();
    const availability = {
      appleIntelligence: true,
      localLLM: false,
      byok: false,
    };

    expect(activateInferenceModeSnapshot(state, 'apple', availability)).toEqual({
      success: true,
      state: {
        activeMode: 'apple',
        availability,
      },
    });
  });

  test('syncs availability without changing active mode and exposes active provider', () => {
    const state = {
      ...baseState(),
      activeMode: 'byok' as const,
    };

    const availability = {
      appleIntelligence: true,
      localLLM: true,
      byok: true,
    };

    expect(syncInferenceModeSnapshot(state, availability)).toEqual({ availability });
    expect(getInferenceProviderFromMode(state)).toBe('byok');
  });
});
