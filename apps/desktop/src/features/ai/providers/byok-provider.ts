/**
 * BYOK (Bring Your Own Key) Provider
 *
 * Routes completions and metadata generation to external AI APIs
 * (OpenAI-compatible, Anthropic, Google) using user-supplied keys.
 *
 * Adapted from the mobile BYOK provider but uses plain async/await
 * instead of Effect, and reads from the desktop settings store.
 */

import type { AIProvider, AIProviderError, CompletionRequest, CompletionResponse, MetadataOutput, AIProviderKind } from '../types';
import { buildSummaryPrompt, buildTagsPrompt, parseTagsResponse } from '../metadata-text';
import { loadSettings } from '@/lib/settings-storage';

// ---------------------------------------------------------------------------
// Per-provider API configuration
// ---------------------------------------------------------------------------

type BYOKProviderType = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'custom';

interface APIConfig {
  resolveEndpoint: (baseUrl: string, model: string, apiKey: string) => string;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: (prompt: string, model: string, systemPrompt?: string) => string;
  parseResponse: (data: unknown) => string;
}

const API_CONFIGS: Record<string, APIConfig> = {
  openai: {
    resolveEndpoint: (baseUrl) => `${baseUrl}/chat/completions`,
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (prompt, model, systemPrompt) =>
      JSON.stringify({
        model,
        messages: systemPrompt
          ? [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ]
          : [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.3,
      }),
    parseResponse: (data) => {
      const r = data as { choices?: { message?: { content?: string } }[] };
      return r.choices?.[0]?.message?.content ?? '';
    },
  },
  deepseek: {
    resolveEndpoint: (baseUrl) => `${baseUrl}/chat/completions`,
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (prompt, model, systemPrompt) =>
      JSON.stringify({
        model,
        messages: systemPrompt
          ? [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ]
          : [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.3,
      }),
    parseResponse: (data) => {
      const r = data as { choices?: { message?: { content?: string } }[] };
      return r.choices?.[0]?.message?.content ?? '';
    },
  },
  custom: {
    // Custom provider uses OpenAI-compatible API shape
    resolveEndpoint: (baseUrl) => `${baseUrl}/chat/completions`,
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (prompt, model, systemPrompt) =>
      JSON.stringify({
        model,
        messages: systemPrompt
          ? [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ]
          : [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.3,
      }),
    parseResponse: (data) => {
      const r = data as { choices?: { message?: { content?: string } }[] };
      return r.choices?.[0]?.message?.content ?? '';
    },
  },
  anthropic: {
    resolveEndpoint: () => 'https://api.anthropic.com/v1/messages',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (prompt, model, systemPrompt) =>
      JSON.stringify({
        model,
        max_tokens: 150,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: 'user', content: prompt }],
      }),
    parseResponse: (data) => {
      const r = data as { content?: { text?: string }[] };
      return r.content?.[0]?.text ?? '';
    },
  },
  google: {
    resolveEndpoint: (_baseUrl, model, apiKey) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (prompt, _model, systemPrompt) =>
      JSON.stringify({
        contents: [
          ...(systemPrompt
            ? [{ role: 'user', parts: [{ text: systemPrompt }] }]
            : []),
          { role: 'user', parts: [{ text: prompt }] },
        ],
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
      return settings.aiProvider === 'byok' && settings.byok.apiKey.length > 0;
    },

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      const settings = loadSettings();
      const providerType = (config?.provider ?? settings.byok.provider) as BYOKProviderType;
      const apiKey = config?.apiKey ?? settings.byok.apiKey;
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
        body: apiConfig.buildBody(request.prompt, model, request.systemPrompt),
      });

      if (!response.ok) {
        throwProviderError(
          'AI_PROVIDER_INVALID_RESPONSE',
          `API request failed with status ${response.status}`,
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
      const summaryResponse = await this.complete({
        prompt: buildSummaryPrompt(content, title),
        maxTokens: 150,
        temperature: 0.3,
      });

      const tagsResponse = await this.complete({
        prompt: buildTagsPrompt(content, title),
        maxTokens: 100,
        temperature: 0.2,
      });

      return {
        summary: summaryResponse.text.trim(),
        tags: parseTagsResponse(tagsResponse.text),
      };
    },
  };
}

export const byokProvider = createBYOKProvider();
