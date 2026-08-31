/**
 * BYOK (Bring Your Own Key) Metadata Provider
 *
 * Uses external AI APIs (OpenAI, Anthropic, Google) for metadata generation.
 * Requires user-provided API keys.
 */

import { Effect } from 'effect';
import type {
  MetadataProvider,
  MetadataInput,
  MetadataOutput,
  AIProviderError,
  AIProviderErrorCode,
} from '../metadata/types';
import { aiProviderError } from '../metadata/types';
import {
  isBYOKReady,
  getApiKey,
  getBaseUrl,
  getModel,
  getProvider,
} from '@/src/features/settings/byok.selectors';
import {
  ensureBYOKHydrated,
  type BYOKProviderType,
} from '@/src/stores/settings/byok.store';
import {
  DEFAULT_OPENAI_BASE_URL,
  getDefaultByokModel,
  normalizeBaseUrl,
} from '@/src/features/settings/byok.defaults';
import { buildSummaryPrompt, buildTagsPrompt, parseTagsResponse } from './metadata-text';

type APIConfig = {
  endpoint: string;
  defaultModel: string;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: (prompt: string, model: string) => string;
  parseResponse: (data: unknown) => string;
};

type BYOKRequestContext = {
  apiKey: string;
  provider: BYOKProviderType;
  baseUrl: string | null;
  modelOverride: string | null;
  fetchFn: typeof fetch;
  timeoutMs: number;
};

/**
 * BYOK provider configuration
 */
export interface BYOKProviderConfig {
  /** Check if BYOK is ready (defaults to isBYOKReady selector) */
  isReady?: () => boolean;
  /** Get API key (defaults to getApiKey selector) */
  getApiKey?: () => string | null;
  /** Get base URL override (defaults to getBaseUrl selector) */
  getBaseUrl?: () => string | null;
  /** Get model override (defaults to getModel selector) */
  getModel?: () => string | null;
  /** Get provider type (defaults to getProvider selector) */
  getProvider?: () => BYOKProviderType | null;
  /**
   * Ensure BYOK settings are restored before reading the store
   * (defaults to ensureBYOKHydrated) — 콜드스타트 복원 레이스 방지용
   */
  hydrate?: () => Promise<void>;
  /** Custom fetch function for testing */
  fetch?: typeof fetch;
  /** Request timeout in ms (defaults to 30s) */
  timeoutMs?: number;
}

/**
 * API request configuration per provider
 */
const API_CONFIGS: Record<
  BYOKProviderType,
  APIConfig
> = {
  openai: {
    endpoint: '/chat/completions',
    defaultModel: getDefaultByokModel('openai'),
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (prompt, model) =>
      JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.3,
      }),
    parseResponse: (data) => {
      const response = data as { choices?: { message?: { content?: string } }[] };
      return response.choices?.[0]?.message?.content ?? '';
    },
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: getDefaultByokModel('anthropic'),
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (prompt, model) =>
      JSON.stringify({
        model,
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    parseResponse: (data) => {
      const response = data as { content?: { text?: string }[] };
      return response.content?.[0]?.text ?? '';
    },
  },
  google: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: getDefaultByokModel('google'),
    buildHeaders: () => ({
      'Content-Type': 'application/json',
    }),
    buildBody: (prompt, _model) =>
      JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    parseResponse: (data) => {
      const response = data as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    },
  },
};

/**
 * Map HTTP error codes to AI provider error codes
 */
function mapErrorToCode(status: number): AIProviderErrorCode {
  if (status === 429) return 'AI_PROVIDER_RATE_LIMITED';
  if (status >= 500) return 'AI_PROVIDER_INTERNAL_ERROR';
  if (status >= 400) return 'AI_PROVIDER_INVALID_RESPONSE';
  return 'AI_PROVIDER_NETWORK_ERROR';
}

const BYOK_TIMEOUT_MS = 30_000;

function createBYOKError(
  code: AIProviderErrorCode,
  message: string,
  details?: Record<string, unknown>
): AIProviderError {
  return aiProviderError(code, 'byok', message, details);
}

function failBYOK(
  code: AIProviderErrorCode,
  message: string,
  details?: Record<string, unknown>
): Effect.Effect<never, AIProviderError> {
  return Effect.fail(createBYOKError(code, message, details));
}

function resolveEndpoint(
  provider: BYOKProviderType,
  config: APIConfig,
  model: string,
  apiKey: string,
  baseUrl: string | null
): string {
  if (provider === 'openai') {
    const resolvedBaseUrl = normalizeBaseUrl(baseUrl) ?? DEFAULT_OPENAI_BASE_URL;
    return `${resolvedBaseUrl}${config.endpoint}`;
  }

  if (provider === 'google') {
    return `${config.endpoint}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  }

  return config.endpoint;
}

/**
 * Make an API call to the configured provider (Effect version)
 */
function callAPIEffect(
  context: BYOKRequestContext,
  prompt: string,
): Effect.Effect<string, AIProviderError> {
  return Effect.gen(function* (_) {
    const { provider, apiKey, baseUrl, modelOverride, fetchFn, timeoutMs } = context;
    const config = API_CONFIGS[provider];
    const model = modelOverride ?? config.defaultModel;
    const endpoint = resolveEndpoint(provider, config, model, apiKey, baseUrl);

    // AbortSignal.timeout은 React Native 런타임에 존재하지 않는다(polyfill에
    // static timeout이 없음). 플래그 기반 AbortController로 대체한다 —
    // RN fetch(whatwg-fetch)는 abort 시 항상 AbortError로 거부하므로
    // 타임아웃 여부는 에러 이름이 아닌 timedOut 플래그로 판정한다.
    let timedOut = false;
    const response = yield* _(
      Effect.tryPromise({
        try: async () => {
          const controller = new AbortController();
          const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs);
          try {
            return await fetchFn(endpoint, {
              method: 'POST',
              headers: config.buildHeaders(apiKey),
              body: config.buildBody(prompt, model),
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timer);
          }
        },
        catch: (error) =>
          createBYOKError(
            timedOut ? 'AI_PROVIDER_TIMEOUT' : 'AI_PROVIDER_NETWORK_ERROR',
            timedOut
              ? `API request timed out after ${timeoutMs}ms`
              : 'Network error during API call',
            {
              provider,
              cause: error,
            },
          ),
      }),
    );

    if (!response.ok) {
      return yield* _(
        failBYOK(
          mapErrorToCode(response.status),
          `API request failed with status ${response.status}`,
          { provider, status: response.status },
        ),
      );
    }

    const data = yield* _(
      Effect.tryPromise({
        try: () => response.json(),
        catch: (error) =>
          createBYOKError('AI_PROVIDER_INVALID_RESPONSE', 'Failed to parse API response', {
            provider,
            cause: error,
          }),
      }),
    );

    const text = config.parseResponse(data);

    if (!text) {
      return yield* _(failBYOK('AI_PROVIDER_INVALID_RESPONSE', 'Empty response from API', { provider }));
    }

    return text;
  });
}

function resolveRequestContext(
  checkIsReady: () => boolean,
  getKey: () => string | null,
  getProviderType: () => BYOKProviderType | null,
  getBaseUrlValue: () => string | null,
  getModelValue: () => string | null,
  fetchFn: typeof fetch,
  timeoutMs: number
): BYOKRequestContext | AIProviderError {
  if (!checkIsReady()) {
    return createBYOKError('AI_PROVIDER_UNAVAILABLE', 'BYOK is not configured or disabled');
  }

  const apiKey = getKey();
  const provider = getProviderType();

  if (!apiKey || !provider) {
    return createBYOKError('AI_PROVIDER_UNAVAILABLE', 'API key or provider not configured');
  }

  return {
    apiKey,
    provider,
    baseUrl: getBaseUrlValue(),
    modelOverride: getModelValue(),
    fetchFn,
    timeoutMs,
  };
}

/**
 * Create a BYOK metadata provider.
 *
 * Availability requirements:
 * - BYOK is enabled
 * - API key is configured
 * - Provider is selected
 */
export function createBYOKProvider(config: BYOKProviderConfig = {}): MetadataProvider {
  const checkIsReady = config.isReady ?? isBYOKReady;
  const getKey = config.getApiKey ?? getApiKey;
  const getBaseUrlValue = config.getBaseUrl ?? getBaseUrl;
  const getModelValue = config.getModel ?? getModel;
  const getProviderType = config.getProvider ?? getProvider;
  const hydrate = config.hydrate ?? ensureBYOKHydrated;
  const fetchFn = config.fetch ?? fetch;
  const timeoutMs = config.timeoutMs ?? BYOK_TIMEOUT_MS;

  return {
    name: 'byok',

    async isAvailable(): Promise<boolean> {
      return checkIsReady();
    },

    generate(
      input: MetadataInput,
    ): Effect.Effect<MetadataOutput, AIProviderError> {
      return Effect.gen(function* (_) {
        // 콜드스타트 직후 SecureStore 복원이 끝나지 않은 상태에서
        // 스토어를 읽어 UNAVAILABLE로 거부되는 레이스 방지 — 채팅 경로와 동일 게이트.
        yield* _(
          Effect.tryPromise({
            try: () => hydrate(),
            catch: (error) =>
              createBYOKError(
                'AI_PROVIDER_UNAVAILABLE',
                'Failed to restore BYOK settings',
                { cause: error },
              ),
          }),
        );

        const requestContext = resolveRequestContext(
          checkIsReady,
          getKey,
          getProviderType,
          getBaseUrlValue,
          getModelValue,
          fetchFn,
          timeoutMs
        );

        if ('code' in requestContext) {
          return yield* _(Effect.fail(requestContext));
        }

        const summaryText = yield* _(
          callAPIEffect(requestContext, buildSummaryPrompt(input)),
        );

        const tagsText = yield* _(
          callAPIEffect(requestContext, buildTagsPrompt(input)),
        );

        return {
          summary: summaryText,
          tags: parseTagsResponse(tagsText),
        };
      });
    },
  };
}

/**
 * Default BYOK provider instance
 *
 * Uses default selectors for availability checking.
 */
export const byokProvider = createBYOKProvider();

// Export for testing
export { buildSummaryPrompt, buildTagsPrompt, parseTagsResponse, API_CONFIGS };
