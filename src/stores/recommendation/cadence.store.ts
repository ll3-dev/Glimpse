import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

type RecommendationCadenceStoreActions = {
  setCadence: (cadence: number) => void;
  reset: () => void;
};

type RecommendationCadenceStoreState = {
  currentCadence: number;
  actions: RecommendationCadenceStoreActions;
};

const DEFAULT_CADENCE = 7 * 24 * 60 * 60 * 1000;

const recommendationCadenceStore =
  createStore<RecommendationCadenceStoreState>((set) => ({
    currentCadence: DEFAULT_CADENCE,
    actions: {
      setCadence: (cadence: number) => {
        set({ currentCadence: cadence });
      },
      reset: () => {
        set({ currentCadence: DEFAULT_CADENCE });
      },
    },
  }));

export function getRecommendationCadenceValue(): number {
  return recommendationCadenceStore.getState().currentCadence;
}

export function setRecommendationCadenceValue(cadence: number): void {
  recommendationCadenceStore.getState().actions.setCadence(cadence);
}

export function useRecommendationCadenceStoreValue(): number {
  return useStore(recommendationCadenceStore, (state) => state.currentCadence);
}

export function resetRecommendationCadenceForTest(): void {
  recommendationCadenceStore.getState().actions.reset();
}
