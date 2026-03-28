import { describe, expect, test } from 'bun:test';
import {
  createAppleIntelligenceSnapshot,
  disableAppleIntelligenceSnapshot,
  enableAppleIntelligenceSnapshot,
  setAppleIntelligenceEnabledSnapshot,
  type AppleIntelligenceStoreState,
} from './apple-intelligence';

const state: AppleIntelligenceStoreState = {
  enabled: false,
  actions: {
    setEnabled: () => {},
    enable: () => {},
    disable: () => {},
  },
};

describe('apple intelligence snapshots', () => {
  test('starts disabled by default', () => {
    expect(createAppleIntelligenceSnapshot()).toEqual({ enabled: false });
  });

  test('sets enabled flag explicitly', () => {
    expect(setAppleIntelligenceEnabledSnapshot(state, true)).toEqual({ enabled: true });
    expect(setAppleIntelligenceEnabledSnapshot(state, false)).toEqual({ enabled: false });
  });

  test('provides enable and disable convenience updates', () => {
    expect(enableAppleIntelligenceSnapshot(state)).toEqual({ enabled: true });
    expect(disableAppleIntelligenceSnapshot(state)).toEqual({ enabled: false });
  });
});
