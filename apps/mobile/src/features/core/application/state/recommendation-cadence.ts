/**
 * Recommendation cadence state snapshots and types.
 */

export const DEFAULT_RECOMMENDATION_CADENCE = 7 * 24 * 60 * 60 * 1000;

export interface RecommendationCadenceStoreActions {
  setCadence: (cadence: number) => void;
  reset: () => void;
}

export interface RecommendationCadenceStoreState {
  currentCadence: number;
  actions: RecommendationCadenceStoreActions;
}

export function createRecommendationCadenceSnapshot(): Omit<RecommendationCadenceStoreState, 'actions'> {
  return {
    currentCadence: DEFAULT_RECOMMENDATION_CADENCE,
  };
}

export function resetRecommendationCadenceSnapshot(): Omit<RecommendationCadenceStoreState, 'actions'> {
  return createRecommendationCadenceSnapshot();
}

export function setRecommendationCadenceSnapshot(
  _state: RecommendationCadenceStoreState,
  cadence: number
): Partial<RecommendationCadenceStoreState> {
  return { currentCadence: cadence };
}
