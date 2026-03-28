import { describe, expect, test } from 'bun:test';

describe('nativeCoreClient web fallback', () => {
  test('provides stub implementation when mocked for test environment', async () => {
    const { nativeCoreClient } = await import('./native-core-client');

    // In test environment, the module is mocked to provide stub implementations
    // rather than throwing, so native and web-dependent code can be tested
    expect(nativeCoreClient).toBeDefined();
    expect(typeof nativeCoreClient.initialize).toBe('function');
    expect(typeof nativeCoreClient.saveKnowledgeItem).toBe('function');
  });
});
