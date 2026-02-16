import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

export type AppleIntelligenceStoreState = {
  enabled: boolean;
};

export function createAppleIntelligenceStore(): StoreApi<AppleIntelligenceStoreState> {
  return createStore<AppleIntelligenceStoreState>(() => ({
    enabled: false,
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
  store.setState({ enabled });
}

export function useAppleIntelligenceStoreValue<T>(
  store: StoreApi<AppleIntelligenceStoreState>,
  selector: (state: AppleIntelligenceStoreState) => T,
): T {
  return useStore(store, selector);
}
