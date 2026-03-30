/**
 * Local LLM Provider
 *
 * Routes completions and metadata generation through the Tauri-managed
 * local LLM runtime (llama.cpp under the hood).
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
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
      const messages: TauriCompletionMessage[] = [];
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      messages.push({ role: 'user', content: request.prompt });

      const tauriRequest: TauriCompletionRequest = {
        runtimeId,
        modelId,
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

/**
 * Stream a completion using the Rust `stream_completion` command.
 * Listens for `llm:stream-token` events and calls onToken for each.
 */
export async function completeLocalLLMStream(
  messages: { role: string; content: string }[],
  callbacks: StreamingCallbacks,
  runtimeId = 'managed-local',
  modelId = 'qwen3.5-2b-q4',
): Promise<string | null> {
  try {
    const health = await invoke<TauriRuntimeHealth>('get_runtime_health');
    if (health.status !== 'healthy' || health.loadedModelId === null) {
      return null;
    }
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
    modelId,
    messages: tauriMessages,
    maxTokens: 512,
    temperature: 0.7,
  };

  let fullText = '';
  let unlisten: (() => void) | null = null;

  try {
    unlisten = await listen<{ requestId: string; token: string }>(
      'llm:stream-token',
      (event) => {
        if (event.payload.requestId === requestId) {
          fullText += event.payload.token;
          callbacks.onToken(event.payload.token);
        }
      },
    );

    await invoke<TauriCompletionResponse>('stream_completion', {
      request: tauriRequest,
      requestId,
    });

    const text = fullText.replace(/^Assistant:\s*/i, '').trim();
    callbacks.onDone(text);
    return text || null;
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    return null;
  } finally {
    unlisten?.();
  }
}

export const localLLMProvider = createLocalLLMProvider();
