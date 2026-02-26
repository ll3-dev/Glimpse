import { describe, expect, test, mock } from 'bun:test';
import {
  createBYOKProvider,
  buildSummaryPrompt,
  buildTagsPrompt,
  parseTagsResponse,
  API_CONFIGS,
} from './byok-provider';

/**
 * Create a mock fetch function
 */
function createMockFetch(
  response: { ok: boolean; json: () => Promise<unknown> } | Error
): typeof fetch {
  return mock(async () => {
    if (response instanceof Error) {
      throw response;
    }
    return response as Response;
  }) as typeof fetch;
}

/**
 * Create a mock JSON response
 */
function createJsonResponse(data: unknown, ok = true) {
  return {
    ok,
    json: async () => data,
  };
}

describe('buildSummaryPrompt', () => {
  test('builds prompt with content only', () => {
    const prompt = buildSummaryPrompt({ content: 'Test content' });
    expect(prompt).toContain('Test content');
    expect(prompt).toContain('Summarize');
  });

  test('builds prompt with title and content', () => {
    const prompt = buildSummaryPrompt({
      title: 'Test Title',
      content: 'Test content',
    });
    expect(prompt).toContain('Title: Test Title');
    expect(prompt).toContain('Test content');
  });

  test('does not include title when undefined', () => {
    const prompt = buildSummaryPrompt({
      content: 'Test content',
      title: undefined,
    });
    expect(prompt).not.toContain('Title:');
    expect(prompt).toContain('Test content');
  });
});

describe('buildTagsPrompt', () => {
  test('builds prompt for tag extraction', () => {
    const prompt = buildTagsPrompt({ content: 'Test content' });
    expect(prompt).toContain('Test content');
    expect(prompt).toContain('tags');
    expect(prompt).toContain('comma-separated');
  });

  test('builds prompt with title and content', () => {
    const prompt = buildTagsPrompt({
      title: 'Test Title',
      content: 'Test content',
    });
    expect(prompt).toContain('Title: Test Title');
    expect(prompt).toContain('Test content');
  });
});

describe('parseTagsResponse', () => {
  test('parses comma-separated tags', () => {
    const tags = parseTagsResponse('apple, banana, cherry');
    expect(tags).toEqual(['apple', 'banana', 'cherry']);
  });

  test('parses newline-separated tags', () => {
    const tags = parseTagsResponse('apple\nbanana\ncherry');
    expect(tags).toEqual(['apple', 'banana', 'cherry']);
  });

  test('removes quotes and hash symbols', () => {
    const tags = parseTagsResponse('"apple", #banana, \'cherry\'');
    expect(tags).toEqual(['apple', 'banana', 'cherry']);
  });

  test('limits to 5 tags', () => {
    const tags = parseTagsResponse('a, b, c, d, e, f, g');
    expect(tags.length).toBe(5);
  });

  test('returns unique tags', () => {
    const tags = parseTagsResponse('apple, banana, apple, cherry');
    expect(tags).toEqual(['apple', 'banana', 'cherry']);
  });

  test('filters empty tags', () => {
    const tags = parseTagsResponse('apple, , banana, , cherry');
    expect(tags).toEqual(['apple', 'banana', 'cherry']);
  });

  test('filters tags longer than 50 characters', () => {
    const longTag = 'a'.repeat(60);
    const tags = parseTagsResponse(`short, ${longTag}, another`);
    expect(tags).toEqual(['short', 'another']);
  });
});

// API integration tests

describe('API_CONFIGS', () => {
  test('has config for openai', () => {
    expect(API_CONFIGS.openai).toBeDefined();
    expect(API_CONFIGS.openai.endpoint).toBe('/chat/completions');
    expect(API_CONFIGS.openai.defaultModel).toBeDefined();
  });

  test('has config for anthropic', () => {
    expect(API_CONFIGS.anthropic).toBeDefined();
    expect(API_CONFIGS.anthropic.endpoint).toContain('anthropic.com');
  });

  test('has config for google', () => {
    expect(API_CONFIGS.google).toBeDefined();
    expect(API_CONFIGS.google.endpoint).toContain('generativelanguage.googleapis.com');
  });

  test('openai buildHeaders includes Authorization', () => {
    const headers = API_CONFIGS.openai.buildHeaders('test-key');
    expect(headers['Authorization']).toBe('Bearer test-key');
  });

  test('anthropic buildHeaders includes x-api-key', () => {
    const headers = API_CONFIGS.anthropic.buildHeaders('test-key');
    expect(headers['x-api-key']).toBe('test-key');
  });
});

describe('createBYOKProvider', () => {
  describe('isAvailable', () => {
    test('returns true when BYOK is ready', async () => {
      const provider = createBYOKProvider({
        isReady: () => true,
      });

      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    test('returns false when BYOK is not ready', async () => {
      const provider = createBYOKProvider({
        isReady: () => false,
      });

      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('generate', () => {
    test('returns error when not ready', async () => {
      const provider = createBYOKProvider({
        isReady: () => false,
      });

      const result = await provider.generate({ content: 'test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AI_PROVIDER_UNAVAILABLE');
      }
    });

    test('returns error when API key is missing', async () => {
      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => null,
        getProvider: () => 'openai',
      });

      const result = await provider.generate({ content: 'test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('API key');
      }
    });

    test('returns error when provider is not selected', async () => {
      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => null,
      });

      const result = await provider.generate({ content: 'test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('provider');
      }
    });

    test('generates summary and tags successfully with OpenAI', async () => {
      const mockFetch = createMockFetch(
        createJsonResponse({
          choices: [{ message: { content: 'Test summary' } }],
        })
      );

      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await provider.generate({
        title: 'Test Title',
        content: 'Test content for generation.',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary).toBe('Test summary');
        expect(Array.isArray(result.data.tags)).toBe(true);
      }

      // Verify fetch was called twice (summary + tags)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('uses custom OpenAI base URL override', async () => {
      const mockFetch = createMockFetch(
        createJsonResponse({
          choices: [{ message: { content: 'Test summary' } }],
        })
      );

      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
        getBaseUrl: () => 'http://localhost:11434/v1',
        fetch: mockFetch as unknown as typeof fetch,
      });

      await provider.generate({ content: 'test' });

      const firstCallArgs = (mockFetch as ReturnType<typeof mock>).mock.calls[0] as [string];
      expect(firstCallArgs[0]).toBe('http://localhost:11434/v1/chat/completions');
    });

    test('uses model override when provided', async () => {
      const mockFetch = mock(async (_url: string, options?: RequestInit) => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
        _options: options,
      }));

      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
        getModel: () => 'gpt-4.1-mini',
        fetch: mockFetch as unknown as typeof fetch,
      });

      await provider.generate({ content: 'test' });

      const call = (mockFetch as ReturnType<typeof mock>).mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(call[1]?.body ?? '{}')) as { model?: string };
      expect(body.model).toBe('gpt-4.1-mini');
    });

    test('uses model override in Google endpoint (preview allowed)', async () => {
      const modelId = 'gemini-3-flash-preview';
      const mockFetch = createMockFetch(
        createJsonResponse({
          candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        })
      );

      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'AIzaSy-test-key',
        getProvider: () => 'google',
        getModel: () => modelId,
        fetch: mockFetch as unknown as typeof fetch,
      });

      await provider.generate({ content: 'test' });

      const firstCallArgs = (mockFetch as ReturnType<typeof mock>).mock.calls[0] as [string];
      expect(firstCallArgs[0]).toContain('/models/gemini-3-flash-preview:generateContent');
      expect(firstCallArgs[0]).toContain('?key=AIzaSy-test-key');
    });

    test('handles rate limiting (429)', async () => {
      const mockFetch = mock(async () => ({
        ok: false,
        status: 429,
        json: async () => ({ error: 'rate limited' }),
      }));

      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await provider.generate({ content: 'test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AI_PROVIDER_RATE_LIMITED');
      }
    });

    test('handles network errors', async () => {
      const mockFetch = mock(async () => {
        throw new TypeError('fetch failed');
      });

      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await provider.generate({ content: 'test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AI_PROVIDER_NETWORK_ERROR');
      }
    });

    test('handles empty API response', async () => {
      const mockFetch = createMockFetch(
        createJsonResponse({ choices: [{ message: { content: '' } }] })
      );

      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await provider.generate({ content: 'test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AI_PROVIDER_INVALID_RESPONSE');
      }
    });
  });
});
