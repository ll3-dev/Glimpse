import { describe, expect, test } from 'bun:test';

describe('nativeCoreClient web fallback', () => {
  test('throws a clear error when the web stub is imported', async () => {
    await expect(import('./native-core-client')).rejects.toThrow(
      'Native CoreClient is not available on web platform'
    );
  });
});
