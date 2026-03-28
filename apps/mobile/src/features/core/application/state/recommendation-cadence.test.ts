import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_RECOMMENDATION_CADENCE,
  createRecommendationCadenceSnapshot,
  resetRecommendationCadenceSnapshot,
  setRecommendationCadenceSnapshot,
  type RecommendationCadenceStoreState,
} from './recommendation-cadence';

const state: RecommendationCadenceStoreState = {
  currentCadence: DEFAULT_RECOMMENDATION_CADENCE,
  actions: {
    setCadence: () => {},
    reset: () => {},
  },
};

describe('recommendation cadence snapshots', () => {
  test('starts and resets to the default cadence', () => {
    expect(createRecommendationCadenceSnapshot()).toEqual({
      currentCadence: DEFAULT_RECOMMENDATION_CADENCE,
    });
    expect(resetRecommendationCadenceSnapshot()).toEqual({
      currentCadence: DEFAULT_RECOMMENDATION_CADENCE,
    });
  });

  test('returns partial state updates for cadence changes', () => {
    expect(setRecommendationCadenceSnapshot(state, 60_000)).toEqual({
      currentCadence: 60_000,
    });
  });
});
