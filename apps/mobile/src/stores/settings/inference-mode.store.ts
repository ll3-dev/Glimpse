import {
  activateInferenceModeSnapshot,
  createInferenceModeSnapshot,
  getInferenceProviderFromMode,
  resetInferenceModeSnapshot,
  syncInferenceModeSnapshot,
  type InferenceMode,
  type InferenceModeAvailability,
  type InferenceModeStoreActions,
  type InferenceModeStoreState,
} from '@/src/features/core/application/state';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

const inferenceModeStore = createStore<InferenceModeStoreState>((set, get) => ({
  ...createInferenceModeSnapshot(),
  actions: {
    activate: (mode, availability) => {
      const result = activateInferenceModeSnapshot(get(), mode, availability);
      if (result.success && result.state) {
        set((state) => ({ ...state, ...result.state }));
      }
      return result;
    },
    reset: () => {
      set((state) => ({
        ...state,
        ...resetInferenceModeSnapshot(),
      }));
    },
    sync: (availability) => {
      set((state) => syncInferenceModeSnapshot(state, availability));
    },
  },
}));

export function getInferenceMode(): InferenceMode {
  return inferenceModeStore.getState().activeMode;
}

export function useInferenceMode(): InferenceMode {
  return useStore(inferenceModeStore, (state) => state.activeMode);
}

export function activateInferenceMode(
  mode: Exclude<InferenceMode, 'default'>,
  availability?: InferenceModeAvailability
) {
  return inferenceModeStore.getState().actions.activate(mode, availability);
}

export function resetInferenceMode(): void {
  inferenceModeStore.getState().actions.reset();
}

export function syncInferenceMode(availability: InferenceModeAvailability): void {
  inferenceModeStore.getState().actions.sync(availability);
}

export function getInferenceProvider(): InferenceMode {
  return getInferenceProviderFromMode(inferenceModeStore.getState());
}

export function useInferenceProvider(): InferenceMode {
  return useStore(inferenceModeStore, getInferenceProviderFromMode);
}

export type {
  InferenceMode,
  InferenceModeAvailability,
  InferenceModeStoreActions,
  InferenceModeStoreState,
};
