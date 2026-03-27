/**
 * Apple Intelligence state snapshots and types.
 */

export interface AppleIntelligenceConfig {
  enabled: boolean;
}

export interface AppleIntelligenceStoreActions {
  setEnabled: (enabled: boolean) => void;
  enable: () => void;
  disable: () => void;
}

export interface AppleIntelligenceStoreState {
  enabled: boolean;
  actions: AppleIntelligenceStoreActions;
}

export function createAppleIntelligenceSnapshot(): AppleIntelligenceConfig {
  return { enabled: false };
}

export function setAppleIntelligenceEnabledSnapshot(
  _state: AppleIntelligenceStoreState,
  enabled: boolean
): Partial<AppleIntelligenceStoreState> {
  return { enabled };
}

export function enableAppleIntelligenceSnapshot(
  _state: AppleIntelligenceStoreState
): Partial<AppleIntelligenceStoreState> {
  return { enabled: true };
}

export function disableAppleIntelligenceSnapshot(
  _state: AppleIntelligenceStoreState
): Partial<AppleIntelligenceStoreState> {
  return { enabled: false };
}
