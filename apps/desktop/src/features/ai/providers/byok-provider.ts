/**
 * BYOK (Bring Your Own Key) Provider
 *
 * Routes completions and metadata generation to external AI APIs
 * (OpenAI-compatible, Anthropic, Google) using user-supplied keys.
 *
 * Adapted from the mobile BYOK provider but uses plain async/await
 * instead of Effect, and reads from the desktop settings store.
 */

import type { AIProvider, AIProviderError, CompletionRequest, CompletionResponse, MetadataOutput, AIProviderKind, StreamingCallbacks } from '../types';
import { buildSummaryPrompt, buildTagsPrompt, parseTagsResponse } from '../metadata-text';
import { loadApiKey, loadSettings } from '@/lib/settings-storage';

// ---------------------------------------------------------------------------
// Per-provider API configuration
// ---------------------------------------------------------------------------

type BYOKProviderType = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'custom';

/** 요청 파라미터 전달 옵션 — 미지정 시 프로바이더 기본값 사용 */
interface BodyOpts {
  maxTokens?: number;
  temperature?: number;
}

interface APIConfig {
  resolveEndpoint: (baseUrl: string, model: string, apiKey: string) => string;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: (prompt: string, model: string, systemPrompt?: string, opts?: BodyOpts) => string;
  parseResponse: (data: unknown) => string;
  /** Build a streaming request body (messages format). */
  buildStreamBody?: (messages: { role: string; content: string }[], model: string, opts?: BodyOpts) => string;
  /** Extract token text from an SSE data payload. */
  parseSSEToken?: (data: unknown) => string;
  /** Whether this provider uses streaming-by-default endpoint or query param. */
  streamEndpoint?: (baseUrl: string, model: string, apiKey: string) => string;
}

const API_CONFIGS: Record<string, APIConfig> = {
  openai: {
    resolveEndpoint: (baseUrl) => `${baseUrl}/chat/completions`,
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (prompt, model, systemPrompt, opts) =>
      JSON.stringify({
        model,
        messages: systemPrompt
          ? [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ]
          : [{ role: 'user', content: prompt }],
        max_tokens: opts?.maxTokens ?? 150,
        temperature: opts?.temperature ?? 0.3,
      }),
    parseResponse: (data) => {
      const r = data as { choices?: { message?: { content?: string } }[] };
      return r.choices?.[0]?.message?.content ?? '';
    },
    buildStreamBody: (messages, model, opts) =>
      JSON.stringify({
        model,
        messages,
        max_tokens: opts?.maxTokens ?? 1024,
        temperature: opts?.temperature ?? 0.7,
        stream: true,
      }),
    parseSSEToken: (data) => {
      const r = data as { choices?: { delta?: { content?: string } }[] };
      return r.choices?.[0]?.delta?.content ?? '';
    },
  },
  deepseek: {
    resolveEndpoint: (baseUrl) => `${baseUrl}/chat/completions`,
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (prompt, model, systemPrompt, opts) =>
      JSON.stringify({
        model,
        messages: systemPrompt
          ? [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ]
          : [{ role: 'user', content: prompt }],
        max_tokens: opts?.maxTokens ?? 150,
        temperature: opts?.temperature ?? 0.3,
      }),
    parseResponse: (data) => {
      const r = data as { choices?: { message?: { content?: string } }[] };
      return r.choices?.[0]?.message?.content ?? '';
    },
    buildStreamBody: (messages, model, opts) =>
      JSON.stringify({
        model,
        messages,
        max_tokens: opts?.maxTokens ?? 1024,
        temperature: opts?.temperature ?? 0.7,
        stream: true,
      }),
    parseSSEToken: (data) => {
      const r = data as { choices?: { delta?: { content?: string } }[] };
      return r.choices?.[0]?.delta?.content ?? '';
    },
  },
  custom: {
    // Custom provider uses OpenAI-compatible API shape
    resolveEndpoint: (baseUrl) => `${baseUrl}/chat/completions`,
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (prompt, model, systemPrompt, opts) =>
      JSON.stringify({
        model,
        messages: systemPrompt
          ? [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ]
          : [{ role: 'user', content: prompt }],
        max_tokens: opts?.maxTokens ?? 150,
        temperature: opts?.temperature ?? 0.3,
      }),
    parseResponse: (data) => {
      const r = data as { choices?: { message?: { content?: string } }[] };
      return r.choices?.[0]?.message?.content ?? '';
    },
    buildStreamBody: (messages, model, opts) =>
      JSON.stringify({
        model,
        messages,
        max_tokens: opts?.maxTokens ?? 1024,
        temperature: opts?.temperature ?? 0.7,
        stream: true,
      }),
    parseSSEToken: (data) => {
      const r = data as { choices?: { delta?: { content?: string } }[] };
      return r.choices?.[0]?.delta?.content ?? '';
    },
  },
  anthropic: {
    resolveEndpoint: () => 'https://api.anthropic.com/v1/messages',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (prompt, model, systemPrompt, opts) =>
      JSON.stringify({
        model,
        max_tokens: opts?.maxTokens ?? 150,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: 'user', content: prompt }],
      }),
    parseResponse: (data) => {
      const r = data as { content?: { text?: string }[] };
      return r.content?.[0]?.text ?? '';
    },
    buildStreamBody: (messages, model, opts) => {
      const systemMsg = messages.find((m) => m.role === 'system');
      const nonSystem = messages.filter((m) => m.role !== 'system');
      return JSON.stringify({
        model,
        max_tokens: opts?.maxTokens ?? 1024,
        stream: true,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: nonSystem,
      });
    },
    parseSSEToken: (data) => {
      // Anthropic uses content_block_delta with text delta
      const r = data as { type?: string; delta?: { text?: string } };
      if (r.type === 'content_block_delta') {
        return r.delta?.text ?? '';
      }
      return '';
    },
  },
  google: {
    resolveEndpoint: (_baseUrl, model, apiKey) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (prompt, _model, systemPrompt, opts) =>
      JSON.stringify({
        contents: [
          ...(systemPrompt
            ? [{ role: 'user', parts: [{ text: systemPrompt }] }]
            : []),
          { role: 'user', parts: [{ text: prompt }] },
        ],
        generationConfig: {
          maxOutputTokens: opts?.maxTokens ?? 150,
          temperature: opts?.temperature ?? 0.3,
        },
      }),
    parseResponse: (data) => {
      const r = data as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return r.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    },
  },
};

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

export interface BYOKProviderConfig {
  provider?: BYOKProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

function throwProviderError(code: string, message: string, provider: AIProviderKind): never {
  const err: AIProviderError = { code, message, provider };
  throw err;
}

export function createBYOKProvider(config?: BYOKProviderConfig): AIProvider {
  return {
    kind: 'byok' as const,

    async isAvailable(): Promise<boolean> {
      const settings = loadSettings();
      if (config) {
        return !!(config.apiKey && config.provider);
      }
      if (settings.aiProvider !== 'byok') return false;
      // 키는 키체인에 있다 — 설정에 키가 없어도 저장된 키로 판정한다
      const apiKey = await loadApiKey(settings.byok.provider);
      return apiKey.length > 0;
    },

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      const settings = loadSettings();
      const providerType = (config?.provider ?? settings.byok.provider) as BYOKProviderType;
      const apiKey = config?.apiKey ?? (await loadApiKey(settings.byok.provider));
      const baseUrl = config?.baseUrl ?? settings.byok.baseUrl;
      const model = config?.model ?? settings.byok.model;
      const fetchFn = config?.fetchFn ?? fetch;

      if (!apiKey) {
        throwProviderError('AI_PROVIDER_UNAVAILABLE', 'BYOK API key not configured', 'byok');
      }

      const apiConfig = API_CONFIGS[providerType] ?? API_CONFIGS['openai'];
      const endpoint = apiConfig.resolveEndpoint(baseUrl, model, apiKey);

      const response = await fetchFn(endpoint, {
        method: 'POST',
        headers: apiConfig.buildHeaders(apiKey),
        body: apiConfig.buildBody(request.prompt, model, request.systemPrompt, {
          maxTokens: request.maxTokens,
          temperature: request.temperature,
        }),
      });

      if (!response.ok) {
        // 상태별 에러 매핑 — 401/403(키 문제)와 429(레이트 제한)를
        // 구분해 사용자가 원인을 알 수 있게 한다.
        const code =
          response.status === 401 || response.status === 403
            ? 'AI_PROVIDER_UNAUTHORIZED'
            : response.status === 429
              ? 'AI_PROVIDER_RATE_LIMITED'
              : 'AI_PROVIDER_INVALID_RESPONSE';
        const body = await response.text().catch(() => '');
        throwProviderError(
          code,
          `API request failed with status ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
          'byok',
        );
      }

      const data = await response.json();
      const text = apiConfig.parseResponse(data);

      if (!text) {
        throwProviderError('AI_PROVIDER_INVALID_RESPONSE', 'Empty response from API', 'byok');
      }

      return { text, provider: 'byok' };
    },

    async generateMetadata(content: string, title?: string | null): Promise<MetadataOutput> {
      const [summaryResponse, tagsResponse] = await Promise.all([
        this.complete({
          prompt: buildSummaryPrompt(content, title),
          maxTokens: 150,
          temperature: 0.3,
        }),
        this.complete({
          prompt: buildTagsPrompt(content, title),
          maxTokens: 100,
          temperature: 0.2,
        }),
      ]);

      return {
        summary: summaryResponse.text.trim(),
        tags: parseTagsResponse(tagsResponse.text),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// SSE streaming helpers
// ---------------------------------------------------------------------------

/**
 * Parse a ReadableStream<Uint8Array> of SSE text into individual event payloads.
 * Handles chunked data where a single SSE event may span multiple chunks.
 */
async function consumeSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  parseSSEToken: (data: unknown) => string,
  callbacks: StreamingCallbacks,
): Promise<string> {
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines
      const lines = buffer.split('\n');
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed: unknown = JSON.parse(jsonStr);
            const token = parseSSEToken(parsed);
            if (token) {
              fullText += token;
              callbacks.onToken(token);
            }
          } catch {
            // Skip unparseable SSE lines (e.g. event type lines)
          }
        }
      }
    }
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }

  callbacks.onDone(fullText);
  return fullText;
}

/**
 * Perform a streaming completion using the BYOK provider's SSE endpoint.
 *
 * Returns the full accumulated text. Tokens are delivered via `callbacks.onToken`
 * as they arrive. If the provider does not support streaming (no `buildStreamBody`
 * in its config), returns `null` so the caller can fall back.
 */
export async function completeBYOKStream(
  messages: { role: string; content: string }[],
  callbacks: StreamingCallbacks,
  config?: BYOKProviderConfig,
): Promise<string | null> {
  const settings = loadSettings();
  const providerType = (config?.provider ?? settings.byok.provider) as BYOKProviderType;
  const apiKey = config?.apiKey ?? (await loadApiKey(settings.byok.provider));
  const baseUrl = config?.baseUrl ?? settings.byok.baseUrl;
  const model = config?.model ?? settings.byok.model;
  const fetchFn = config?.fetchFn ?? fetch;

  if (!apiKey) return null;

  const apiConfig = API_CONFIGS[providerType] ?? API_CONFIGS['openai'];

  // If this provider config doesn't have streaming support, signal fallback
  if (!apiConfig.buildStreamBody || !apiConfig.parseSSEToken) return null;

  const endpoint = apiConfig.resolveEndpoint(baseUrl, model, apiKey);

  try {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: apiConfig.buildHeaders(apiKey),
      body: apiConfig.buildStreamBody(messages, model),
    });

    if (!response.ok) {
      // 401/403/429 는 비스트리밍 폴백으로 넘기면 안 된다 — 같은 이유로
      // 재요청해 레이트 리밋을 2배 소모하고 키 문제를 감춘다. complete 와
      // 동일하게 매핑해 즉시 실패시킨다.
      if (response.status === 401 || response.status === 403) {
        throwProviderError(
          'AI_PROVIDER_UNAUTHORIZED',
          `Streaming API request failed with status ${response.status} (invalid key)`,
          'byok',
        );
      }
      if (response.status === 429) {
        throwProviderError(
          'AI_PROVIDER_RATE_LIMITED',
          'Streaming API request rate limited (429)',
          'byok',
        );
      }
      return null; // Fall back to non-streaming
    }

    if (!response.body) {
      return null; // No readable stream available
    }

    const reader = response.body.getReader();
    return consumeSSEStream(reader, apiConfig.parseSSEToken, callbacks);
  } catch (error) {
    // 의도적 provider 에러(401/403/429 매핑)는 폴백하지 않고 그대로
    // 전파한다 — catch 가 삼키면 폴백 재요청이 레이트 리밋을 2배 소모한다.
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string' &&
      String((error as { code: unknown }).code).startsWith('AI_PROVIDER_')
    ) {
      throw error;
    }
    // 실패 원인이 유실되지 않게 기록하고 비스트리밍으로 폴백한다
    console.warn('[byok] streaming failed, falling back to non-streaming:', error);
    return null;
  }
}

export const byokProvider = createBYOKProvider();
