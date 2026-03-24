/**
 * useChat Hook
 *
 * Manages chat state and AI response generation.
 */

import { useState, useCallback, useRef } from 'react';
import { useAddMessageMutation } from '@/src/hooks';
import { executeChatTarget, resolveEffectiveTarget } from '@/src/features/ai/targets';
import type { KnowledgeItem } from '@glimpse/shared';
import { isFailure } from '@/src/lib/effect-result';
import { logger } from '@/src/utils/logger';
import { generateAssistantReply, savePartialAssistantReply } from './chatGeneration';
import { getLocalLLMRuntime } from './chatRuntime';
import { getSelectedLocalModel } from '@/src/features/settings/local-llm.selectors';

interface UseChatOptions {
  conversationId: string;
  contextItem?: KnowledgeItem | null;
}

interface UseChatResult {
  sendMessage: (text: string) => Promise<boolean>;
  isGenerating: boolean;
  streamingText: string;
  error: string | null;
  /** Abort current generation and save partial response */
  abortAndSave: () => Promise<void>;
}

export function useChat({ conversationId, contextItem }: UseChatOptions): UseChatResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Use ref to persist streaming text across renders for abort saving
  const streamingTextRef = useRef('');

  const { mutateAsync: addMessage } = useAddMessageMutation();

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isGenerating) return false;

    setError(null);
    setIsGenerating(true);
    setStreamingText('');
    streamingTextRef.current = '';

    try {
      const target = resolveEffectiveTarget('chat');

      if (target.kind === 'local') {
        const model = getSelectedLocalModel();
        if (!model?.path) {
          throw new Error('선택된 로컬 채팅 모델이 없습니다.');
        }

        const runtime = getLocalLLMRuntime();
        await generateAssistantReply({
          runtime,
          model,
          conversationId,
          userText: text.trim(),
          contextItem,
          addMessage,
          streamingTextRef,
          onToken: (token) => {
            setStreamingText((prev) => prev + token);
          },
        });
      } else {
        await addMessage({
          conversationId,
          role: 'user',
          content: text.trim(),
        });

        const result = await executeChatTarget(target, {
          userText: text.trim(),
          contextItem,
        });

        if (isFailure(result)) {
          throw new Error(result.error.message);
        }

        streamingTextRef.current = result.data;
        setStreamingText(result.data);

        await addMessage({
          conversationId,
          role: 'assistant',
          content: result.data,
        });
      }

      streamingTextRef.current = '';
      setStreamingText('');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '응답 생성에 실패했습니다.';
      setError(errorMessage);
      logger.error('Chat generation failed', err);
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [conversationId, contextItem, isGenerating, addMessage]);

  /**
   * Abort current generation and save partial response
   */
  const abortAndSave = useCallback(async () => {
    const runtime = getLocalLLMRuntime();
    await runtime.stopGeneration();
    try {
      await savePartialAssistantReply({
        conversationId,
        addMessage,
        partialText: streamingTextRef.current,
      });
    } catch (err) {
      logger.error('Failed to save partial response', err);
    }

    streamingTextRef.current = '';
    setStreamingText('');
    setIsGenerating(false);
  }, [conversationId, addMessage]);

  return {
    sendMessage,
    isGenerating,
    streamingText,
    error,
    abortAndSave,
  };
}
