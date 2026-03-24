import {
  createRecommendationCadenceSnapshot,
  DEFAULT_RECOMMENDATION_CADENCE,
  resetRecommendationCadenceSnapshot,
  setRecommendationCadenceSnapshot,
  type RecommendationCadenceStoreActions,
  type RecommendationCadenceStoreState,
} from '@glimpse/core/application/state';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

const recommendationCadenceStore =
  createStore<RecommendationCadenceStoreState>((set) => ({
    ...createRecommendationCadenceSnapshot(),
    actions: {
      setCadence: (cadence: number) => {
        set((state) => setRecommendationCadenceSnapshot(state, cadence));
      },
      reset: () => {
        set(() => resetRecommendationCadenceSnapshot());
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

export {
  DEFAULT_RECOMMENDATION_CADENCE,
  type RecommendationCadenceStoreActions,
  type RecommendationCadenceStoreState,
};
