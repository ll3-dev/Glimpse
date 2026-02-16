import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

export type AppleIntelligenceStoreActions = {
  setEnabled: (enabled: boolean) => void;
  enable: () => void;
  disable: () => void;
};

export type AppleIntelligenceStoreState = {
  enabled: boolean;
  actions: AppleIntelligenceStoreActions;
};

export function createAppleIntelligenceStore(): StoreApi<AppleIntelligenceStoreState> {
  return createStore<AppleIntelligenceStoreState>((set) => ({
    enabled: false,
    actions: {
      setEnabled: (enabled: boolean) => {
        set({ enabled });
      },
      enable: () => {
        set({ enabled: true });
      },
      disable: () => {
        set({ enabled: false });
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
