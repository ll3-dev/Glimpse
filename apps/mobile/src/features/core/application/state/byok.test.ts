import { describe, expect, test } from 'bun:test';
import {
  BYOK_PROVIDERS,
  createBYOKSnapshot,
  isBYOKProvider,
  resetBYOKSnapshot,
  updateBYOKConfigSnapshot,
  type BYOKStoreState,
} from './byok';

describe('BYOK state snapshots', () => {
  test('recognizes only supported providers', () => {
    expect(BYOK_PROVIDERS).toEqual(['openai', 'anthropic', 'google']);
    expect(isBYOKProvider('openai')).toBe(true);
    expect(isBYOKProvider('anthropic')).toBe(true);
    expect(isBYOKProvider('google')).toBe(true);
    expect(isBYOKProvider('claude')).toBe(false);
    expect(isBYOKProvider(null)).toBe(false);
  });

  test('creates a detached snapshot from persisted config', () => {
    const persisted = {
      enabled: true,
      provider: 'openai' as const,
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
      model: 'gpt-test',
    };

    const snapshot = createBYOKSnapshot(persisted);
    persisted.apiKey = 'changed';

    expect(snapshot).toEqual({
      enabled: true,
      provider: 'openai',
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
      model: 'gpt-test',
    });
  });

  test('resets to disabled empty defaults', () => {
    expect(resetBYOKSnapshot()).toEqual({
      enabled: false,
      provider: null,
      apiKey: null,
      baseUrl: null,
      model: null,
    });
  });

  test('returns only config patch when updating state', () => {
    const state = {
      config: resetBYOKSnapshot(),
      actions: {
        updateConfig: () => {},
        resetConfig: () => {},
      },
    } satisfies BYOKStoreState;

    const result = updateBYOKConfigSnapshot(state, (config) => ({
      ...config,
      enabled: true,
      provider: 'google',
    }));

    expect(result).toEqual({
      config: {
        enabled: true,
        provider: 'google',
        apiKey: null,
        baseUrl: null,
        model: null,
      },
    });
  });
});
