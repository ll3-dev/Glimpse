import {
  createRecommendationCadenceSnapshot,
  DEFAULT_RECOMMENDATION_CADENCE,
  resetRecommendationCadenceSnapshot,
  setRecommendationCadenceSnapshot,
  type RecommendationCadenceStoreActions,
  type RecommendationCadenceStoreState,
} from '@/src/features/core/application/state';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { storage, StorageKeys } from '@/src/lib/storage';

function getInitialCadence(): number {
  const persisted = storage.getNumber(StorageKeys.RECOMMENDATION_CADENCE);
  return persisted && persisted > 0 ? persisted : DEFAULT_RECOMMENDATION_CADENCE;
}

const recommendationCadenceStore =
  createStore<RecommendationCadenceStoreState>((set) => ({
    ...createRecommendationCadenceSnapshot(),
    currentCadence: getInitialCadence(),
    actions: {
      setCadence: (cadence: number) => {
        storage.set(StorageKeys.RECOMMENDATION_CADENCE, cadence);
        set((state) => setRecommendationCadenceSnapshot(state, cadence));
      },
      reset: () => {
        storage.remove(StorageKeys.RECOMMENDATION_CADENCE);
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
