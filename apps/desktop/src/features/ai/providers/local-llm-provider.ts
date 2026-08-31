/**
 * Local LLM Provider
 *
 * Routes completions and metadata generation through the Tauri-managed
 * local LLM runtime (llama.cpp under the hood).
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { subscribeEvent } from '@rustra/tauri';
import type { AIProvider, CompletionRequest, CompletionResponse, MetadataOutput, StreamingCallbacks } from '../types';
import { buildSummaryPrompt, buildTagsPrompt, parseTagsResponse } from '../metadata-text';

// ---------------------------------------------------------------------------
// Tauri command shapes (matching Rust models.rs)
// ---------------------------------------------------------------------------

interface TauriCompletionMessage {
  role: string;
  content: string;
}

interface TauriCompletionRequest {
  runtimeId: string;
  modelId: string;
  messages: TauriCompletionMessage[];
  maxTokens?: number;
  temperature?: number;
}

interface TauriCompletionResponse {
  text: string;
  stopReason: string;
}

interface TauriRuntimeHealth {
  status: string;
  loadedModelId: string | null;
  lastUnloadAt: number | null;
  queueDepth: number;
  memoryPressure: string;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function createLocalLLMProvider(
  runtimeId = 'managed-local',
  modelId = 'qwen3.5-2b-q4',
): AIProvider {
  return {
    kind: 'local-llm' as const,

    async isAvailable(): Promise<boolean> {
      try {
        const health = await invoke<TauriRuntimeHealth>('get_runtime_health');
        return health.status === 'healthy' && health.loadedModelId !== null;
      } catch {
        return false;
      }
    },

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      const health = await invoke<TauriRuntimeHealth>('get_runtime_health').catch(() => null);
      const effectiveModelId = health?.loadedModelId || modelId;

      const messages: TauriCompletionMessage[] = [];
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      messages.push({ role: 'user', content: request.prompt });

      const tauriRequest: TauriCompletionRequest = {
        runtimeId,
        modelId: effectiveModelId,
        messages,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      };

      const response = await invoke<TauriCompletionResponse>('run_completion', {
        request: tauriRequest,
      });

      return {
        text: response.text,
        provider: 'local-llm',
      };
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

/**
 * Stream a completion using the Rust `stream_completion` command.
 *
 * Token events now travel the rustra event-push path: Rust emits through the
 * `glimpse.core` package and the `tauri_event_sink` installed in src-tauri
 * setup delivers them on the `rustra://`-prefixed channel. `:` and `-` pass
 * rustra's channel-name sanitization unchanged, so the suffix is identical to
 * the old hand-written event name. The payload arrives as an already-parsed
 * object (Tauri emit_str splices raw JSON into JS source) with the same
 * camelCase shape as before — no JSON.parse, no handler changes.
 */

// Qwen3 등 reasoning 모델의 사고 블록 — 스트리밍 표시와 최종 텍스트 양쪽에서
// 제거한다(Rust engine의 strip_think_block과 같은 규칙). 스트리밍 UI는
// append-only라 이미 보낸 텍스트를 회수할 수 없으므로, `<think>`가 올 수
// 있는 동안은 홀딩했다가 `</think>` 도착 후 정답만 흘려보낸다.
const THINK_OPEN = '<think>';
const THINK_CLOSE = '</think>';

function stripThinkBlock(text: string): string {
  const closeIdx = text.indexOf(THINK_CLOSE);
  if (closeIdx !== -1) {
    return text.slice(closeIdx + THINK_CLOSE.length).trim();
  }
  const openIdx = text.indexOf(THINK_OPEN);
  if (openIdx !== -1) {
    return text.slice(0, openIdx).trim();
  }
  return text;
}

/** think 규칙을 적용한 뒤 UI로 흘려보낼 수 있는 부분. */
function streamDisplayText(fullText: string): string {
  const closeIdx = fullText.indexOf(THINK_CLOSE);
  if (closeIdx !== -1) {
    return fullText.slice(closeIdx + THINK_CLOSE.length).replace(/^\s+/, '');
  }
  // `<think>` 전체가 도착했거나 부분 태그일 가능성이 남아 있으면 홀딩.
  // 그 외(일반 답변)는 그대로 표시.
  if (fullText.includes(THINK_OPEN) || THINK_OPEN.startsWith(fullText)) {
    return '';
  }
  return fullText;
}

export async function completeLocalLLMStream(
  messages: { role: string; content: string }[],
  callbacks: StreamingCallbacks,
  runtimeId = 'managed-local',
  modelId = 'qwen3.5-2b-q4',
): Promise<string | null> {
  let effectiveModelId = modelId;
  try {
    const health = await invoke<TauriRuntimeHealth>('get_runtime_health');
    if (health.status !== 'healthy' || health.loadedModelId === null) {
      return null;
    }
    effectiveModelId = health.loadedModelId;
  } catch {
    return null;
  }

  const requestId = crypto.randomUUID();

  const tauriMessages: TauriCompletionMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const tauriRequest: TauriCompletionRequest = {
    runtimeId,
    modelId: effectiveModelId,
    messages: tauriMessages,
    // reasoning 모델(Qwen3 등)은 /no_think 억제가 안 먹히면 사고에 수백~
    // 수천 토큰을 쓴다 — 512로는 답 도달 전 예산이 끊긴다(실측).
    maxTokens: 1024,
    temperature: 0.7,
  };

  let fullText = '';
  let visibleText = '';
  let unlisten: (() => void) | null = null;

  try {
    // rustra 0.4.0 이벤트 계약 헬퍼 — 채널명(`rustra://llm:stream-token`)과
    // JSON 파싱을 @rustra/tauri가 처리한다. 페이로드는 선언된 계약과 같은
    // camelCase 모양({requestId, token}).
    unlisten = await subscribeEvent<{ requestId: string; token: string }>(
      listen,
      'llm:stream-token',
      (payload) => {
        if (payload.requestId !== requestId) {
          return;
        }
        fullText += payload.token;
        const display = streamDisplayText(fullText);
        if (display.startsWith(visibleText) && display.length > visibleText.length) {
          callbacks.onToken(display.slice(visibleText.length));
          visibleText = display;
        }
      },
    );

    await invoke<TauriCompletionResponse>('stream_completion', {
      request: tauriRequest,
      requestId,
    });

    const text = stripThinkBlock(fullText).replace(/^Assistant:\s*/i, '').trim();
    callbacks.onDone(text);
    // 사고 예산 소진으로 최종 텍스트가 비면 null — 라우터가 비(非)스트리밍
    // 폴백 또는 정직한 실패 경로로 넘기고, [No response] 같은 가짜 답은 안 만든다.
    return text || null;
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    return null;
  } finally {
    unlisten?.();
  }
}
