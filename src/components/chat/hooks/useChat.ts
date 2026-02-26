/**
 * useChat Hook
 *
 * Manages chat state and AI response generation.
 */

import { useState, useCallback } from 'react';
import { useAddMessageMutation } from '@/src/hooks';
import {
  isLocalLLMReady,
  getSelectedLocalModel,
} from '@/src/features/settings/local-llm.selectors';
import { createLlamaService, type LlamaService } from '@/src/features/ai/llama-service';
import type { KnowledgeItem } from '@/src/db';
import { logger } from '@/src/utils/logger';

interface UseChatOptions {
  conversationId: string;
  contextItem?: KnowledgeItem | null;
}

interface UseChatResult {
  sendMessage: (text: string) => Promise<void>;
  isGenerating: boolean;
  streamingText: string;
  error: string | null;
}

// Track loaded model across hook instances
let loadedModelId: string | null = null;
let llamaService: LlamaService | null = null;

function getLlamaService(): LlamaService {
  if (!llamaService) {
    llamaService = createLlamaService();
  }
  return llamaService;
}

/**
 * Build system prompt based on context.
 */
function buildSystemPrompt(contextItem?: KnowledgeItem | null): string {
  const basePrompt = `당신은 도움이 되는 AI 어시스턴트입니다. 한국어로 친근하고 자연스럽게 대화해 주세요.`;

  if (!contextItem) {
    return basePrompt;
  }

  const contextInfo = [];
  if (contextItem.title) {
    contextInfo.push(`제목: ${contextItem.title}`);
  }
  if (contextItem.body) {
    contextInfo.push(`내용: ${contextItem.body}`);
  }
  if (contextItem.url) {
    contextInfo.push(`URL: ${contextItem.url}`);
  }
  if (contextItem.summary) {
    contextInfo.push(`요약: ${contextItem.summary}`);
  }
  if (contextItem.tags && contextItem.tags.length > 0) {
    contextInfo.push(`태그: ${contextItem.tags.join(', ')}`);
  }

  if (contextInfo.length === 0) {
    return basePrompt;
  }

  return `${basePrompt}

사용자가 다음 항목에 대해 질문하고 있습니다:
${contextInfo.join('\n')}

이 컨텍스트를 바탕으로 질문에 답변해 주세요.`;
}

/**
 * Build prompt with conversation history.
 */
function buildPrompt(messages: { role: 'user' | 'assistant'; content: string }[], contextItem?: KnowledgeItem | null): string {
  const systemPrompt = buildSystemPrompt(contextItem);

  let prompt = `<|system|>\n${systemPrompt}\n<|end|>\n`;

  for (const msg of messages) {
    if (msg.role === 'user') {
      prompt += `<|user|>\n${msg.content}\n<|end|>\n`;
    } else {
      prompt += `<|assistant|)\n${msg.content}\n<|end|>\n`;
    }
  }

  prompt += `<|assistant|)\n`;

  return prompt;
}

export function useChat({ conversationId, contextItem }: UseChatOptions): UseChatResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: addMessage } = useAddMessageMutation();

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isGenerating) return;

    setError(null);
    setIsGenerating(true);
    setStreamingText('');

    try {
      // Save user message
      await addMessage({
        conversationId,
        role: 'user',
        content: text.trim(),
      });

      // Check if Local LLM is available
      if (!isLocalLLMReady()) {
        throw new Error('AI가 준비되지 않았습니다. 설정에서 로컬 LLM을 활성화해 주세요.');
      }

      const model = getSelectedLocalModel();
      if (!model?.path) {
        throw new Error('선택된 모델이 없습니다.');
      }

      const service = getLlamaService();

      // Load model if needed
      if (loadedModelId !== model.id) {
        if (service.isModelLoaded()) {
          await service.unloadModel();
        }
        await service.loadModel(model.path, {
          contextSize: 4096,
          gpuLayers: 0,
        });
        loadedModelId = model.id;
      }

      // Generate response with streaming
      const prompt = buildPrompt(
        [{ role: 'user', content: text.trim() }],
        contextItem
      );

      const result = await service.generateStream(prompt, {
        maxTokens: 512,
        temperature: 0.7,
        topP: 0.9,
        onToken: (token) => {
          setStreamingText((prev) => prev + token);
        },
      });

      // Save assistant message
      await addMessage({
        conversationId,
        role: 'assistant',
        content: result.text.trim(),
      });

      setStreamingText('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '응답 생성에 실패했습니다.';
      setError(errorMessage);
      logger.error('Chat generation failed', err);
    } finally {
      setIsGenerating(false);
    }
  }, [conversationId, contextItem, isGenerating, addMessage]);

  return {
    sendMessage,
    isGenerating,
    streamingText,
    error,
  };
}
