/**
 * Inference mode state snapshots and types.
 */

import type { InferenceMode } from '@glimpse/shared';

export type { InferenceMode };

export interface InferenceModeAvailability {
  appleIntelligence: boolean;
  localLLM: boolean;
  byok: boolean;
}

export interface InferenceModeStoreActions {
  activate: (
    mode: Exclude<InferenceMode, 'default'>,
    availability?: InferenceModeAvailability
  ) => { success: boolean; error?: string };
  reset: () => void;
  sync: (availability: InferenceModeAvailability) => void;
}

export interface InferenceModeStoreState {
  activeMode: InferenceMode;
  availability: InferenceModeAvailability;
  actions: InferenceModeStoreActions;
}

export type InferenceModeTransitionReason = 'user_choice' | 'fallback' | 'config_change';

export function createInferenceModeSnapshot(): Omit<InferenceModeStoreState, 'actions'> {
  return {
    activeMode: 'local',
    availability: {
      appleIntelligence: false,
      localLLM: false,
      byok: false,
    },
  };
}

export function resetInferenceModeSnapshot(): Omit<InferenceModeStoreState, 'actions'> {
  return createInferenceModeSnapshot();
}

export function activateInferenceModeSnapshot(
  state: InferenceModeStoreState,
  mode: Exclude<InferenceMode, 'default'>,
  availability?: InferenceModeAvailability
): { success: boolean; state?: Partial<InferenceModeStoreState>; error?: string } {
  const nextAvailability = availability ?? state.availability;

  if (mode === 'apple' && !nextAvailability.appleIntelligence) {
    return { success: false, error: 'Apple Intelligence not available' };
  }
  if (mode === 'local' && !nextAvailability.localLLM) {
    return { success: false, error: 'Local LLM not available' };
  }
  if (mode === 'byok' && !nextAvailability.byok) {
    return { success: false, error: 'BYOK not configured' };
  }

  return {
    success: true,
    state: {
      activeMode: mode,
      availability: nextAvailability,
    },
  };
}

export function syncInferenceModeSnapshot(
  _state: InferenceModeStoreState,
  availability: InferenceModeAvailability
): Partial<InferenceModeStoreState> {
  return { availability };
}

export function getInferenceProviderFromMode(state: InferenceModeStoreState): InferenceMode {
  return state.activeMode;
}
