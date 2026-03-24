import {
  createAppleIntelligenceSnapshot,
  disableAppleIntelligenceSnapshot,
  enableAppleIntelligenceSnapshot,
  setAppleIntelligenceEnabledSnapshot,
  type AppleIntelligenceStoreActions,
  type AppleIntelligenceStoreState,
} from '@glimpse/core/application/state';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

export function createAppleIntelligenceStore(): StoreApi<AppleIntelligenceStoreState> {
  return createStore<AppleIntelligenceStoreState>((set) => ({
    ...createAppleIntelligenceSnapshot(),
    actions: {
      setEnabled: (enabled: boolean) => {
        set((state) => setAppleIntelligenceEnabledSnapshot(state, enabled));
      },
      enable: () => {
        set((state) => enableAppleIntelligenceSnapshot(state));
      },
      disable: () => {
        set((state) => disableAppleIntelligenceSnapshot(state));
      },
    },
  }));
}

export function getAppleIntelligenceEnabled(
  store: StoreApi<AppleIntelligenceStoreState>,
): boolean {
  return store.getState().enabled;
}

export function setAppleIntelligenceEnabledValue(
  store: StoreApi<AppleIntelligenceStoreState>,
  enabled: boolean,
): void {
  store.getState().actions.setEnabled(enabled);
}

export function useAppleIntelligenceStoreValue<T>(
  store: StoreApi<AppleIntelligenceStoreState>,
  selector: (state: AppleIntelligenceStoreState) => T,
): T {
  return useStore(store, selector);
}

export type { AppleIntelligenceStoreActions, AppleIntelligenceStoreState };
