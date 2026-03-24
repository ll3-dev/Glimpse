export const DEFAULT_RECOMMENDATION_CADENCE = 7 * 24 * 60 * 60 * 1000;

export type RecommendationCadenceStoreActions = {
  setCadence: (cadence: number) => void;
  reset: () => void;
};

export type RecommendationCadenceStoreState = {
  currentCadence: number;
  actions: RecommendationCadenceStoreActions;
};

export function createRecommendationCadenceSnapshot(
  currentCadence: number = DEFAULT_RECOMMENDATION_CADENCE
): Omit<RecommendationCadenceStoreState, 'actions'> {
  return {
    currentCadence,
  };
}

export function setRecommendationCadenceSnapshot(
  state: Omit<RecommendationCadenceStoreState, 'actions'>,
  cadence: number
): Omit<RecommendationCadenceStoreState, 'actions'> {
  return {
    ...state,
    currentCadence: cadence,
  };
}

export function resetRecommendationCadenceSnapshot(): Omit<
  RecommendationCadenceStoreState,
  'actions'
> {
  return createRecommendationCadenceSnapshot();
}
