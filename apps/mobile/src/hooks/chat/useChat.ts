/**
 * useChat Hook
 *
 * Manages chat state and AI response generation.
 */

import { useState, useCallback, useRef } from 'react';
import { useAddMessageMutation } from '@/src/hooks/mutations';
import { useMessagesQuery } from '@/src/hooks/queries';
import { executeChatTarget, resolveEffectiveTarget } from '@/src/features/ai/targets';
import type { KnowledgeItem } from '@glimpse/shared';
import { isFailure } from '@/src/lib/effect-result';
import { logger } from '@/src/utils/logger';
import { generateAssistantReply, savePartialAssistantReply } from './chatGeneration';
import { getLocalLLMRuntime } from './chatRuntime';
import { getSelectedLocalModel } from '@/src/features/settings/local-llm.selectors';
import { buildChatKnowledgeContext } from '@/src/features/ai/chat-context';

interface UseChatOptions {
  conversationId: string;
  contextItem?: KnowledgeItem | null;
  knowledgeItems?: KnowledgeItem[];
}

interface UseChatResult {
  sendMessage: (text: string) => Promise<boolean>;
  isGenerating: boolean;
  streamingText: string;
  error: string | null;
  /** Abort current generation and save partial response */
  abortAndSave: () => Promise<void>;
}

export function useChat({
  conversationId,
  contextItem,
  knowledgeItems = [],
}: UseChatOptions): UseChatResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Use ref to persist streaming text across renders for abort saving
  const streamingTextRef = useRef('');
  // 세대 일련번호 — abort 시 증가시켜 이전 세대의 지연 저장을 무효화한다
  const generationSeqRef = useRef(0);

  const { data: messages } = useMessagesQuery(conversationId);
  const { mutateAsync: addMessage } = useAddMessageMutation();

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isGenerating) return false;

    const generation = ++generationSeqRef.current;
    const isCurrent = () => generation === generationSeqRef.current;

    setError(null);
    setIsGenerating(true);
    setStreamingText('');
    streamingTextRef.current = '';

    try {
      const target = resolveEffectiveTarget('chat');
      const previousMessages = messages?.map((message) => ({
        role: message.role,
        content: message.content,
      })) ?? [];
      const contextItems = buildChatKnowledgeContext(
        text.trim(),
        contextItem,
        knowledgeItems
      );

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
          previousMessages,
          contextItems,
          addMessage,
          streamingTextRef,
          onToken: (token) => {
            setStreamingText((prev) => prev + token);
          },
          isCurrent,
        });
      } else {
        await addMessage({
          conversationId,
          role: 'user',
          content: text.trim(),
        });

        const result = await executeChatTarget(target, {
          userText: text.trim(),
          messages: previousMessages,
          contextItems,
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

      // 에러 시에도 부분 응답이 있으면 저장한다(abort 경로와 동일하게).
      // 이미 abort 가 저장했거나 새 세대가 시작됐으면 건너뛴다.
      if (isCurrent() && streamingTextRef.current.trim()) {
        try {
          await savePartialAssistantReply({
            conversationId,
            addMessage,
            partialText: streamingTextRef.current,
          });
        } catch (saveErr) {
          logger.error('Failed to save partial response after error', saveErr);
        }
      }
      return false;
    } finally {
      if (isCurrent()) {
        setIsGenerating(false);
      }
    }
  }, [conversationId, contextItem, isGenerating, addMessage, knowledgeItems, messages]);

  /**
   * Abort current generation and save partial response
   */
  const abortAndSave = useCallback(async () => {
    // 세대를 무효화 — 진행 중인 generateAssistantReply 가 resolve 돼도
    // 저장을 건너뛰게 한다(이중 저장 방지).
    const generation = ++generationSeqRef.current;
    void generation;

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
