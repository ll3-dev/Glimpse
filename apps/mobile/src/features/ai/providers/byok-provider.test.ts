import { describe, expect, test, mock } from 'bun:test';
import { Effect, Exit } from 'effect';
import {
  createBYOKProvider,
  API_CONFIGS,
} from './byok-provider';
import { isAIProviderError } from '../metadata/types';

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
  }) as unknown as typeof fetch;
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

/**
 * React Native fetch(whatwg-fetch)처럼 signal을 존중하는 hanging fetch:
 * abort되면 AbortError로 거부한다(TimeoutError가 아님 — RN은 항상 AbortError).
 * 타임아웃 분류가 에러 이름이 아닌 구현 측 플래그로 동작함을 강제한다.
 */
function createSignalAwareHangingFetch(): typeof fetch {
  return ((url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    })) as unknown as typeof fetch;
}

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
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
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

  describe('hydration guard', () => {
    function createStoreReadinessHarness() {
      let ready = false;
      return {
        isReady: () => ready,
        markReady: () => {
          ready = true;
        },
      };
    }

    test('awaits hydrate before reading store, so deferred readiness succeeds', async () => {
      const store = createStoreReadinessHarness();
      const mockFetch = createMockFetch(
        createJsonResponse({
          choices: [{ message: { content: 'Hydrated summary' } }],
        })
      );

      const provider = createBYOKProvider({
        isReady: store.isReady,
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
        fetch: mockFetch,
        hydrate: async () => {
          // 콜드스타트 복원이 generate 도중에 완료되는 시나리오
          await new Promise((resolve) => setTimeout(resolve, 10));
          store.markReady();
        },
      });

      const exit = await Effect.runPromiseExit(provider.generate({ content: 'test' }));

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value.summary).toBe('Hydrated summary');
      }
    });

    test('surfaces hydrate failure as AI_PROVIDER_UNAVAILABLE', async () => {
      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
        hydrate: async () => {
          throw new Error('secure store unavailable');
        },
      });

      const exit = await Effect.runPromiseExit(provider.generate({ content: 'test' }));

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        if (isAIProviderError(error)) {
          expect(error.code).toBe('AI_PROVIDER_UNAVAILABLE');
        }
      }
    });
  });

  describe('generate', () => {
    test('returns Effect that fails when not ready', async () => {
      const provider = createBYOKProvider({
        isReady: () => false,
      });

      const effect = provider.generate({ content: 'test' });
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        if (isAIProviderError(error)) {
          expect(error.code).toBe('AI_PROVIDER_UNAVAILABLE');
        }
      }
    });

    test('returns Effect that fails when API key is missing', async () => {
      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => null,
        getProvider: () => 'openai',
      });

      const effect = provider.generate({ content: 'test' });
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        if (isAIProviderError(error)) {
          expect(error.message).toContain('API key');
        }
      }
    });

    test('returns Effect that fails when provider is not selected', async () => {
      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => null,
      });

      const effect = provider.generate({ content: 'test' });
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        if (isAIProviderError(error)) {
          expect(error.message).toContain('provider');
        }
      }
    });

    test('returns Effect that succeeds with metadata using OpenAI', async () => {
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

      const effect = provider.generate({
        title: 'Test Title',
        content: 'Test content for generation.',
      });
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value.summary).toBe('Test summary');
        expect(Array.isArray(exit.value.tags)).toBe(true);
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

      await Effect.runPromise(provider.generate({ content: 'test' }));

      const firstCallArgs = (mockFetch as unknown as unknown as ReturnType<typeof mock>).mock.calls[0] as [string];
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

      await Effect.runPromise(provider.generate({ content: 'test' }));

      const call = (mockFetch as unknown as ReturnType<typeof mock>).mock.calls[0] as [string, RequestInit];
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

      await Effect.runPromise(provider.generate({ content: 'test' }));

      const firstCallArgs = (mockFetch as unknown as ReturnType<typeof mock>).mock.calls[0] as [string];
      expect(firstCallArgs[0]).toContain('/models/gemini-3-flash-preview:generateContent');
      expect(firstCallArgs[0]).toContain('?key=AIzaSy-test-key');
    });

    test('returns Effect that fails on rate limiting (429)', async () => {
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

      const effect = provider.generate({ content: 'test' });
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        if (isAIProviderError(error)) {
          expect(error.code).toBe('AI_PROVIDER_RATE_LIMITED');
        }
      }
    });

    test('returns Effect that fails on network errors', async () => {
      const mockFetch = mock(async () => {
        throw new TypeError('fetch failed');
      });

      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
        fetch: mockFetch as unknown as typeof fetch,
      });

      const effect = provider.generate({ content: 'test' });
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        if (isAIProviderError(error)) {
          expect(error.code).toBe('AI_PROVIDER_NETWORK_ERROR');
        }
      }
    });

    test('returns Effect that fails with AI_PROVIDER_TIMEOUT when request hangs', async () => {
      // React Native fetch(whatwg-fetch)는 abort 시 항상 AbortError로 거부한다 —
      // 타임아웃 분류는 에러 이름이 아니라 구현 측 플래그로 판정되어야 한다.
      const hangingFetch = createSignalAwareHangingFetch();

      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
        fetch: hangingFetch,
        timeoutMs: 20,
      });

      const effect = provider.generate({ content: 'test' });
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        if (isAIProviderError(error)) {
          expect(error.code).toBe('AI_PROVIDER_TIMEOUT');
        }
      }
    });

    test('works without AbortSignal.timeout (React Native runtime has no static timeout)', async () => {
      // 회귀 방지: RN polyfill에는 AbortSignal.timeout가 없다. 이전 구현은
      // TypeError('AbortSignal.timeout is not a function')를 던져 정상 호출까지 실패했다.
      const signalStatic = AbortSignal as unknown as { timeout?: unknown };
      const originalTimeout = signalStatic.timeout;
      delete signalStatic.timeout;

      try {
        const provider = createBYOKProvider({
          isReady: () => true,
          getApiKey: () => 'test-key',
          getProvider: () => 'openai',
          fetch: createSignalAwareHangingFetch(),
          timeoutMs: 20,
        });

        const effect = provider.generate({ content: 'test' });
        const exit = await Effect.runPromiseExit(effect);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
          if (isAIProviderError(error)) {
            expect(error.code).toBe('AI_PROVIDER_TIMEOUT');
          }
        }
      } finally {
        signalStatic.timeout = originalTimeout;
      }
    });

    test('returns Effect that fails with NETWORK_ERROR for non-timeout aborts', async () => {
      // 호출자 측 abort(TimeoutError 아님)는 여전히 NETWORK_ERROR로 분류된다.
      const abortingFetch = (() =>
        Promise.reject(
          new DOMException('The operation was aborted.', 'AbortError')
        )) as unknown as typeof fetch;

      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
        fetch: abortingFetch,
        timeoutMs: 30_000,
      });

      const effect = provider.generate({ content: 'test' });
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        if (isAIProviderError(error)) {
          expect(error.code).toBe('AI_PROVIDER_NETWORK_ERROR');
        }
      }
    });

    test('returns Effect that fails on empty API response', async () => {
      const mockFetch = createMockFetch(
        createJsonResponse({ choices: [{ message: { content: '' } }] })
      );

      const provider = createBYOKProvider({
        isReady: () => true,
        getApiKey: () => 'test-key',
        getProvider: () => 'openai',
        fetch: mockFetch as unknown as typeof fetch,
      });

      const effect = provider.generate({ content: 'test' });
      const exit = await Effect.runPromiseExit(effect);

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause._tag === 'Fail' ? exit.cause.error : null;
        if (isAIProviderError(error)) {
          expect(error.code).toBe('AI_PROVIDER_INVALID_RESPONSE');
        }
      }
    });
  });
});
