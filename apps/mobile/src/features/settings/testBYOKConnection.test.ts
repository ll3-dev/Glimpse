import { describe, expect, it } from 'bun:test';
import { testBYOKConnection } from './testBYOKConnection';

describe('testBYOKConnection', () => {
  it('returns false when api key is empty', async () => {
    const result = await testBYOKConnection({
      provider: 'openai',
      apiKey: '',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('API 키를 입력');
  });

  it('handles invalid connection errors gracefully', async () => {
    const result = await testBYOKConnection({
      provider: 'openai',
      apiKey: 'sk-invalid-test-key-12345',
      baseUrl: 'https://invalid-non-existent-domain-999.xyz',
    });

    expect(result.success).toBe(false);
  });
});
