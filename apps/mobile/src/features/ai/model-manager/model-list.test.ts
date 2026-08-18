import { describe, it, expect } from 'bun:test';
import { RECOMMENDED_MODELS, getModelById, isRecommendedModel } from './model-list';
import { LOCAL_MODEL_REGISTRY } from '@glimpse/shared';

describe('RECOMMENDED_MODELS on mobile', () => {
  it('should only contain models compatible with mobile (platform: mobile or both)', () => {
    expect(RECOMMENDED_MODELS.length).toBeGreaterThan(0);

    for (const model of RECOMMENDED_MODELS) {
      const def = LOCAL_MODEL_REGISTRY.find((m) => m.id === model.id);
      expect(def).toBeDefined();
      expect(['mobile', 'both']).toContain(def!.platform);
    }
  });

  it('should NOT contain desktop-only models', () => {
    const desktopOnlyIds = LOCAL_MODEL_REGISTRY
      .filter((m) => m.platform === 'desktop')
      .map((m) => m.id);

    expect(desktopOnlyIds.length).toBeGreaterThan(0);

    for (const desktopId of desktopOnlyIds) {
      expect(isRecommendedModel(desktopId)).toBe(false);
      expect(getModelById(desktopId)).toBeUndefined();
    }
  });

  it('should find valid models with getModelById', () => {
    const firstModel = RECOMMENDED_MODELS[0];
    const found = getModelById(firstModel.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(firstModel.id);
    expect(isRecommendedModel(firstModel.id)).toBe(true);
  });
});
