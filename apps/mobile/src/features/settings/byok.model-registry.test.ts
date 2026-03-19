import { describe, expect, test } from 'bun:test';
import { BYOK_MODEL_REGISTRY } from './byok.model-registry';
import { isAppOnlyModelRegistry, isPreviewModelAllowed } from './byok.defaults';

describe('byok.model-registry', () => {
  test('is scoped to app-only runtime', () => {
    expect(BYOK_MODEL_REGISTRY.runtime.scope).toBe('app_only');
    expect(BYOK_MODEL_REGISTRY.runtime.externalUseAllowed).toBe(false);
    expect(isAppOnlyModelRegistry()).toBe(true);
  });

  test('preview models are enabled', () => {
    expect(BYOK_MODEL_REGISTRY.selection.allowPreview).toBe(true);
    expect(isPreviewModelAllowed()).toBe(true);
  });
});

