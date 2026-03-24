export type AppleIntelligenceStoreActions = {
  setEnabled: (enabled: boolean) => void;
  enable: () => void;
  disable: () => void;
};

export type AppleIntelligenceStoreState = {
  enabled: boolean;
  actions: AppleIntelligenceStoreActions;
};

export function createAppleIntelligenceSnapshot(
  enabled: boolean = false
): Omit<AppleIntelligenceStoreState, 'actions'> {
  return {
    enabled,
  };
}

export function setAppleIntelligenceEnabledSnapshot(
  state: Omit<AppleIntelligenceStoreState, 'actions'>,
  enabled: boolean
): Omit<AppleIntelligenceStoreState, 'actions'> {
  return {
    ...state,
    enabled,
  };
}

export function enableAppleIntelligenceSnapshot(
  state: Omit<AppleIntelligenceStoreState, 'actions'>
): Omit<AppleIntelligenceStoreState, 'actions'> {
  return setAppleIntelligenceEnabledSnapshot(state, true);
}

export function disableAppleIntelligenceSnapshot(
  state: Omit<AppleIntelligenceStoreState, 'actions'>
): Omit<AppleIntelligenceStoreState, 'actions'> {
  return setAppleIntelligenceEnabledSnapshot(state, false);
}
