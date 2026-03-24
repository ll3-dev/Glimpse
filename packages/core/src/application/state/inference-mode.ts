export const INFERENCE_MODES = [
  'default',
  'apple-intelligence',
  'local-llm',
  'byok',
] as const;

export type InferenceMode = (typeof INFERENCE_MODES)[number];

export type InferenceModeTransitionReason =
  | 'apple_unavailable'
  | 'local_unavailable'
  | 'byok_unavailable';

export type InferenceModeAvailability = {
  appleAvailable: boolean;
  localAvailable: boolean;
  byokAvailable: boolean;
};

export type InferenceModeStoreActions = {
  activate: (
    mode: Exclude<InferenceMode, 'default'>,
    availability?: InferenceModeAvailability
  ) => { ok: true; state: Omit<InferenceModeStoreState, 'actions'> } | {
    ok: false;
    reason: InferenceModeTransitionReason;
    state: Omit<InferenceModeStoreState, 'actions'>;
  };
  reset: () => void;
  sync: (availability: InferenceModeAvailability) => void;
};

export type InferenceModeStoreState = {
  activeMode: InferenceMode;
  actions: InferenceModeStoreActions;
};

export function createInferenceModeSnapshot(
  activeMode: InferenceMode = 'default'
): Omit<InferenceModeStoreState, 'actions'> {
  return { activeMode };
}

export function getInferenceModeAvailabilityReason(
  mode: Exclude<InferenceMode, 'default'>
): InferenceModeTransitionReason {
  switch (mode) {
    case 'apple-intelligence':
      return 'apple_unavailable';
    case 'local-llm':
      return 'local_unavailable';
    case 'byok':
      return 'byok_unavailable';
  }
}

export function canActivateInferenceMode(
  mode: Exclude<InferenceMode, 'default'>,
  availability: InferenceModeAvailability
): boolean {
  switch (mode) {
    case 'apple-intelligence':
      return availability.appleAvailable;
    case 'local-llm':
      return availability.localAvailable;
    case 'byok':
      return availability.byokAvailable;
  }
}

export function activateInferenceModeSnapshot(
  state: Omit<InferenceModeStoreState, 'actions'>,
  mode: Exclude<InferenceMode, 'default'>,
  availability?: InferenceModeAvailability
):
  | { ok: true; state: Omit<InferenceModeStoreState, 'actions'> }
  | {
      ok: false;
      reason: InferenceModeTransitionReason;
      state: Omit<InferenceModeStoreState, 'actions'>;
    } {
  if (availability && !canActivateInferenceMode(mode, availability)) {
    return {
      ok: false,
      reason: getInferenceModeAvailabilityReason(mode),
      state,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      activeMode: mode,
    },
  };
}

export function resetInferenceModeSnapshot(): Omit<InferenceModeStoreState, 'actions'> {
  return createInferenceModeSnapshot();
}

export function syncInferenceModeSnapshot(
  state: Omit<InferenceModeStoreState, 'actions'>,
  availability: InferenceModeAvailability
): Omit<InferenceModeStoreState, 'actions'> {
  if (
    state.activeMode === 'default' ||
    canActivateInferenceMode(
      state.activeMode as Exclude<InferenceMode, 'default'>,
      availability
    )
  ) {
    return state;
  }

  return resetInferenceModeSnapshot();
}

export function getInferenceProviderFromMode(
  state: Pick<InferenceModeStoreState, 'activeMode'>
): InferenceMode {
  return state.activeMode;
}
