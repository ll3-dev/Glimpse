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

/**
 * 스트리밍 토큰 플러시 간격. 토큰마다 setState하면 화면 전체가 토큰 속도
 * (20-60/s)로 재렌더되고 스트리밍 버블이 누적 텍스트 전체를 매번 재파싱해
 * O(n²) 작업이 된다. ref에 누적하고 이 간격으로만 상태에 반영한다.
 */
const STREAMING_FLUSH_INTERVAL_MS = 80;

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
  const lastFlushAtRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 세대 일련번호 — abort 시 증가시켜 이전 세대의 지연 저장을 무효화한다
  const generationSeqRef = useRef(0);

  const cancelPendingFlush = useCallback(() => {
    if (flushTimerRef.current !== null) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

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
    lastFlushAtRef.current = 0;

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
          onToken: () => {
            // 토큰마다 setState하지 않고 간격을 두고 ref 스냅샷으로 플러시한다.
            // 리드 타이머로 즉시 반영을 보장하고, 간격 미달 토큰은 후행 타이머로
            // 마지막 청크를 유실 없이 내보낸다.
            const now = Date.now();
            const elapsed = now - lastFlushAtRef.current;
            if (elapsed >= STREAMING_FLUSH_INTERVAL_MS) {
              cancelPendingFlush();
              lastFlushAtRef.current = now;
              setStreamingText(streamingTextRef.current);
            } else if (flushTimerRef.current === null) {
              flushTimerRef.current = setTimeout(() => {
                flushTimerRef.current = null;
                if (isCurrent()) {
                  lastFlushAtRef.current = Date.now();
                  setStreamingText(streamingTextRef.current);
                }
              }, STREAMING_FLUSH_INTERVAL_MS - elapsed);
            }
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
      cancelPendingFlush();
      setStreamingText('');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '응답 생성에 실패했습니다.';
      // 부분 텍스트는 ref에서 저장하므로, 리셋 후 지연 플러시가 스트리밍
      // 버블을 되살리지 않게 타이머를 먼저 정리한다.
      cancelPendingFlush();
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
  }, [conversationId, contextItem, isGenerating, addMessage, knowledgeItems, messages, cancelPendingFlush]);

  /**
   * Abort current generation and save partial response
   */
  const abortAndSave = useCallback(async () => {
    // 세대를 무효화 — 진행 중인 generateAssistantReply 가 resolve 돼도
    // 저장을 건너뛰게 한다(이중 저장 방지).
    const generation = ++generationSeqRef.current;
    void generation;
    cancelPendingFlush();

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
  }, [conversationId, addMessage, cancelPendingFlush]);

  return {
    sendMessage,
    isGenerating,
    streamingText,
    error,
    abortAndSave,
  };
}
