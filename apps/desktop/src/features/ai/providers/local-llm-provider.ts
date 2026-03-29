/**
 * Local LLM Provider
 *
 * Routes completions and metadata generation through the Tauri-managed
 * local LLM runtime (llama.cpp under the hood).
 */

import { invoke } from '@tauri-apps/api/core';
import type { AIProvider, CompletionRequest, CompletionResponse, MetadataOutput } from '../types';
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
  modelId = 'qwen2.5-3b-instruct-q4_k_m',
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

export const localLLMProvider = createLocalLLMProvider();
