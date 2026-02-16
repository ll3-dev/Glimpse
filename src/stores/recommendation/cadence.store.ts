import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

type RecommendationCadenceStoreState = {
  currentCadence: number;
};

const DEFAULT_CADENCE = 7 * 24 * 60 * 60 * 1000;

const recommendationCadenceStore =
  createStore<RecommendationCadenceStoreState>(() => ({
    currentCadence: DEFAULT_CADENCE,
  }));

export function getRecommendationCadenceValue(): number {
  return recommendationCadenceStore.getState().currentCadence;
}

export function setRecommendationCadenceValue(cadence: number): void {
  recommendationCadenceStore.setState({ currentCadence: cadence });
}

export function useRecommendationCadenceStoreValue(): number {
  return useStore(recommendationCadenceStore, (state) => state.currentCadence);
}

export function resetRecommendationCadenceForTest(): void {
  recommendationCadenceStore.setState({ currentCadence: DEFAULT_CADENCE });
}
