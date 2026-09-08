/**
 * Local Server Provider
 *
 * 외부 로컬 서버(LM Studio·Ollama·llama.cpp/mlx-lm server 등)가 여는
 * OpenAI 호환 localhost 엔드포인트로 완성·메타데이터 생성을 라우팅한다.
 *
 * 구 BYOK 프로바이더의 custom + baseUrl 메커니즘을 전용(재명명·수정)한
 * 것이다 — 클라우드 프리셋과 API 키·키체인 경로는 제거되었고 OpenAI
 * 단일 포맷만 남는다(2026-09-08 완전 로컬 전환).
 */

import type { AIProvider, AIProviderError, CompletionRequest, CompletionResponse, MetadataOutput, StreamingCallbacks } from '../types';
import { buildSummaryPrompt, buildTagsPrompt, parseTagsResponse } from '../metadata-text';
import { loadSettings } from '@/lib/settings-storage';

/** 요청 타임아웃 기본값 — 멍텅구리 커넥션이 채팅을 영원히 붙잡지 않게 한다 */
const LOCAL_SERVER_TIMEOUT_MS = 30_000;

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

/**
 * 플래그 기반 AbortController 타임아웃 — 모바일 byok-provider에서 이식된
 * 패턴. AbortSignal.timeout은 RN 런타임에 없고(realm 이식성 유지),
 * fetch의 abort 거부는 AbortError로만 알려주므로 타임아웃 여부는 에러
 * 이름이 아닌 timedOut 플래그로 판정한다. throw하지 않고 플래그만
 * 돌려준다 — 분류(TIMEOUT throw vs null 폴백)는 호출부의 몫이다.
 *
 * tools/local-server-tools도 같은 타임아웃 계약으로 쓰도록 공개한다.
 */
export async function fetchWithTimeout(
  fetchFn: typeof fetch,
  endpoint: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ response: Response | null; timedOut: boolean }> {
  let timedOut = false;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetchFn(endpoint, { ...init, signal: controller.signal });
    return { response, timedOut };
  } catch (error) {
    if (timedOut) {
      // abort 거부를 그대로 삼키고 플래그로 보고한다 — throw 하면 스트림
      // 경로의 null 폴백에 도달하기 전에 소실된다.
      return { response: null, timedOut: true };
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export interface LocalServerProviderConfig {
  baseUrl?: string;
  model?: string;
  fetchFn?: typeof fetch;
  /** 요청 타임아웃(ms) — 미지정 시 30초. 테스트에서 짧게 주입한다. */
  timeoutMs?: number;
}

function throwProviderError(code: string, message: string): never {
  const err: AIProviderError = { code, message, provider: 'local-server' };
  throw err;
}

/** OpenAI 호환 채팅 완성 요청 바디 — model 이 비면 생략(서버 기본 모델 사용) */
function buildChatBody(
  messages: { role: string; content: string }[],
  model: string,
  opts?: { maxTokens?: number; temperature?: number; stream?: boolean },
): string {
  return JSON.stringify({
    ...(model ? { model } : {}),
    messages,
    max_tokens: opts?.maxTokens ?? 150,
    temperature: opts?.temperature ?? 0.3,
    ...(opts?.stream ? { stream: true } : {}),
  });
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

function parseCompletionText(data: unknown): string {
  const r = data as ChatCompletionResponse;
  return r.choices?.[0]?.message?.content ?? '';
}

export function createLocalServerProvider(config?: LocalServerProviderConfig): AIProvider {
  return {
    kind: 'local-server' as const,

    async isAvailable(): Promise<boolean> {
      if (config) {
        return !!config.baseUrl;
      }
      const settings = loadSettings();
      if (settings.aiProvider !== 'local-server') return false;
      return settings.localServer.baseUrl.trim().length > 0;
    },

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      const settings = loadSettings();
      const baseUrl = normalizeBaseUrl(config?.baseUrl ?? settings.localServer.baseUrl);
      const model = config?.model ?? settings.localServer.model;
      const fetchFn = config?.fetchFn ?? fetch;
      const timeoutMs = config?.timeoutMs ?? LOCAL_SERVER_TIMEOUT_MS;

      if (!baseUrl) {
        throwProviderError(
          'AI_PROVIDER_UNAVAILABLE',
          '로컬 서버 주소가 설정되지 않았습니다. 설정에서 로컬 서버를 감지하거나 주소를 입력해 주세요.',
        );
      }

      const messages: { role: string; content: string }[] = [];
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      messages.push({ role: 'user', content: request.prompt });

      const { response, timedOut } = await fetchWithTimeout(
        fetchFn,
        `${baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: buildChatBody(messages, model, {
            maxTokens: request.maxTokens,
            temperature: request.temperature,
          }),
        },
        timeoutMs,
      );
      if (timedOut || !response) {
        throwProviderError(
          'AI_PROVIDER_TIMEOUT',
          `로컬 서버 요청이 ${timeoutMs}ms 후에도 완료되지 않았습니다.`,
        );
      }

      if (!response.ok) {
        const code =
          response.status === 429 ? 'AI_PROVIDER_RATE_LIMITED' : 'AI_PROVIDER_INVALID_RESPONSE';
        const body = await response.text().catch(() => '');
        throwProviderError(
          code,
          `로컬 서버 요청 실패 (status ${response.status})${body ? `: ${body.slice(0, 200)}` : ''}`,
        );
      }

      const data = await response.json();
      const text = parseCompletionText(data);

      if (!text) {
        throwProviderError('AI_PROVIDER_INVALID_RESPONSE', '로컬 서버가 빈 응답을 반환했습니다.');
      }

      return { text, provider: 'local-server' };
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
            const parsed = JSON.parse(jsonStr) as {
              choices?: { delta?: { content?: string } }[];
            };
            const token = parsed.choices?.[0]?.delta?.content ?? '';
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
 * Perform a streaming completion using the local server's OpenAI-compatible
 * SSE endpoint.
 *
 * Returns the full accumulated text. Tokens are delivered via `callbacks.onToken`
 * as they arrive. Any failure returns null so the caller can fall back.
 */
export async function completeLocalServerStream(
  messages: { role: string; content: string }[],
  callbacks: StreamingCallbacks,
  config?: LocalServerProviderConfig,
): Promise<string | null> {
  const settings = loadSettings();
  const baseUrl = normalizeBaseUrl(config?.baseUrl ?? settings.localServer.baseUrl);
  const model = config?.model ?? settings.localServer.model;
  const fetchFn = config?.fetchFn ?? fetch;
  const timeoutMs = config?.timeoutMs ?? LOCAL_SERVER_TIMEOUT_MS;

  if (!baseUrl) return null;

  try {
    // 타임아웃은 throw 대신 null 폴백 — 멍텅구리 스트림을 비스트리밍 경로로
    // 강등하는 것이 맞는 저하이고, 에러 UI 대신 응답을 받아가는 쪽이 낫다.
    const { response, timedOut } = await fetchWithTimeout(
      fetchFn,
      `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: buildChatBody(messages, model, { maxTokens: 1024, temperature: 0.7, stream: true }),
      },
      timeoutMs,
    );
    if (timedOut || !response) {
      console.warn(
        `[local-server] streaming request timed out after ${timeoutMs}ms, falling back to non-streaming`,
      );
      return null;
    }

    if (!response.ok) {
      return null; // Fall back to non-streaming — 로컬 서버에는 인증 오류 경로가 없다
    }

    if (!response.body) {
      return null; // No readable stream available
    }

    const reader = response.body.getReader();
    return consumeSSEStream(reader, callbacks);
  } catch (error) {
    // 실패 원인이 유실되지 않게 기록하고 비스트리밍으로 폴백한다
    console.warn('[local-server] streaming failed, falling back to non-streaming:', error);
    return null;
  }
}
