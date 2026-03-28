import { describe, expect, test } from 'bun:test';
import { initializeCoreClient } from './initialize-core-client';

describe('initializeCoreClient web fallback', () => {
  test('returns null on web without touching native storage', async () => {
    await expect(initializeCoreClient()).resolves.toBeNull();
  });
});
