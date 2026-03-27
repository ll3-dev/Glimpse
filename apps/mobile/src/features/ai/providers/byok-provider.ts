/**
 * BYOK (Bring Your Own Key) Metadata Provider
 *
 * Uses external AI APIs (OpenAI, Anthropic, Google) for metadata generation.
 * Requires user-provided API keys.
 *
 * TODO: Integrate actual API calls for each provider
 */

import { Effect } from "effect";
import type {
  MetadataProvider,
  MetadataInput,
  MetadataOutput,
  AIProviderError,
  AIProviderErrorCode,
} from "../metadata/types";
import { aiProviderError } from "../metadata/types";
import {
  isBYOKReady,
  getApiKey,
  getBaseUrl,
  getModel,
  getProvider,
} from '@/src/features/settings/byok.selectors';
import type { BYOKProviderType } from '@/src/stores/settings/byok.store';
import {
  DEFAULT_OPENAI_BASE_URL,
  getDefaultByokModel,
  normalizeBaseUrl,
} from '@/src/features/settings/byok.defaults';
import { buildSummaryPrompt, buildTagsPrompt, parseTagsResponse } from './metadata-text';

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
  /** Custom fetch function for testing */
  fetch?: typeof fetch;
}

/**
 * API request configuration per provider
 */
const API_CONFIGS: Record<
  BYOKProviderType,
  {
    endpoint: string;
    defaultModel: string;
    buildHeaders: (apiKey: string) => Record<string, string>;
    buildBody: (prompt: string, model: string) => string;
    parseResponse: (data: unknown) => string;
  }
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

/**
 * Make an API call to the configured provider (Effect version)
 */
function callAPIEffect(
  provider: BYOKProviderType,
  prompt: string,
  apiKey: string,
  baseUrl: string | null,
  modelOverride: string | null,
  fetchFn: typeof fetch,
): Effect.Effect<string, AIProviderError> {
  return Effect.gen(function* (_) {
    const config = API_CONFIGS[provider];
    const model = modelOverride || config.defaultModel;

    let endpoint = config.endpoint;
    if (provider === "openai") {
      const resolvedBaseUrl =
        normalizeBaseUrl(baseUrl) ?? DEFAULT_OPENAI_BASE_URL;
      endpoint = `${resolvedBaseUrl}${config.endpoint}`;
    } else if (provider === "google") {
      endpoint = `${config.endpoint}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
    }

    const headers = config.buildHeaders(apiKey);

    const response = yield* _(
      Effect.tryPromise({
        try: () =>
          fetchFn(endpoint, {
            method: "POST",
            headers,
            body: config.buildBody(prompt, model),
          }),
        catch: (e) =>
          aiProviderError(
            "AI_PROVIDER_NETWORK_ERROR",
            "byok",
            "Network error during API call",
            { provider, cause: e },
          ),
      }),
    );

    if (!response.ok) {
      return yield* _(
        Effect.fail(
          aiProviderError(
            mapErrorToCode(response.status),
            "byok",
            `API request failed with status ${response.status}`,
            { provider, status: response.status },
          ),
        ),
      );
    }

    const data = yield* _(
      Effect.tryPromise({
        try: () => response.json(),
        catch: (e) =>
          aiProviderError(
            "AI_PROVIDER_INVALID_RESPONSE",
            "byok",
            "Failed to parse API response",
            { provider, cause: e },
          ),
      }),
    );

    const text = config.parseResponse(data);

    if (!text) {
      return yield* _(
        Effect.fail(
          aiProviderError(
            "AI_PROVIDER_INVALID_RESPONSE",
            "byok",
            "Empty response from API",
            { provider },
          ),
        ),
      );
    }

    return text;
  });
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
  const fetchFn = config.fetch ?? fetch;

  return {
    name: "byok",

    async isAvailable(): Promise<boolean> {
      return checkIsReady();
    },

    generate(
      input: MetadataInput,
    ): Effect.Effect<MetadataOutput, AIProviderError> {
      return Effect.gen(function* (_) {
        // Check availability
        if (!checkIsReady()) {
          return yield* _(
            Effect.fail(
              aiProviderError(
                "AI_PROVIDER_UNAVAILABLE",
                "byok",
                "BYOK is not configured or disabled",
              ),
            ),
          );
        }

        const apiKey = getKey();
        const provider = getProviderType();
        const baseUrl = getBaseUrlValue();
        const model = getModelValue();

        if (!apiKey || !provider) {
          return yield* _(
            Effect.fail(
              aiProviderError(
                "AI_PROVIDER_UNAVAILABLE",
                "byok",
                "API key or provider not configured",
              ),
            ),
          );
        }

        // Generate summary
        const summaryText = yield* _(
          callAPIEffect(
            provider,
            buildSummaryPrompt(input),
            apiKey,
            baseUrl,
            model,
            fetchFn,
          ),
        );

        // Generate tags
        const tagsText = yield* _(
          callAPIEffect(
            provider,
            buildTagsPrompt(input),
            apiKey,
            baseUrl,
            model,
            fetchFn,
          ),
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
