import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { useMessagesQuery, useAddMessageMutation } from '@glimpse/hooks';
import type { Message } from '@glimpse/shared';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { generateResponse } from '@/features/ai/chat-generation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

/**
 * Streaming answer bubble. Owns the accumulating text state so per-token
 * updates re-render only this leaf — not the whole message list above it.
 */
const StreamingBubble = memo(function StreamingBubble({
  subscribe,
}: {
  subscribe: (onToken: (text: string) => void) => () => void;
}) {
  const [content, setContent] = useState('');
  const bubbleRef = useRef<HTMLDivElement>(null);
  useEffect(() => subscribe(setContent), [subscribe]);
  // Keep the growing bubble in view as tokens arrive.
  useEffect(() => {
    bubbleRef.current?.scrollIntoView({ block: 'end' });
  }, [content]);
  if (!content) {
    return (
      <div ref={bubbleRef} className="flex w-full justify-start">
        <div className="rounded-2xl rounded-tl-xs border border-border bg-card px-4 py-3 shadow-2xs">
          <span className="inline-block w-[2px] animate-pulse bg-foreground" style={{ height: '1em' }} />
        </div>
      </div>
    );
  }
  return (
    <div ref={bubbleRef} className="flex w-full justify-start">
      <div className="max-w-[78%] rounded-2xl rounded-tl-xs border border-border bg-card px-4 py-3 shadow-2xs">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {content}
          <span className="inline-block w-[2px] animate-pulse bg-foreground align-text-bottom ml-0.5" style={{ height: '1em' }} />
        </p>
      </div>
    </div>
  );
});

interface ChatViewProps {
  conversationId: string;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const { data: messages, isLoading } = useMessagesQuery(conversationId);
  const addMessage = useAddMessageMutation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  // Streamed tokens land in a ref and are broadcast to the StreamingBubble
  // leaf; ChatView itself never re-renders per token.
  const streamingListenersRef = useRef(new Set<(text: string) => void>());
  const streamingTextRef = useRef('');

  const subscribeStreaming = useCallback((onToken: (text: string) => void) => {
    streamingListenersRef.current.add(onToken);
    onToken(streamingTextRef.current);
    return () => {
      streamingListenersRef.current.delete(onToken);
    };
  }, []);

  const broadcastStreaming = useCallback((text: string) => {
    for (const listener of streamingListenersRef.current) listener(text);
  }, []);

  // Auto-scroll to bottom when messages change. Streaming growth scrolls via
  // a throttled effect inside the streaming window below.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const buildMessageHistory = useCallback(
    (msgs: Message[]): { role: string; content: string }[] =>
      msgs
        .filter((m) => m.deletedAt === null)
        .map((m) => ({ role: m.role, content: m.content })),
    []
  );

  const handleSend = useCallback(
    async (content: string) => {
      const now = Date.now();
      const userMessage: Message = {
        id: crypto.randomUUID(),
        conversationId,
        role: 'user',
        content,
        createdAt: now,
        updatedAt: null,
        deletedAt: null,
      };

      await addMessage.mutateAsync(userMessage);

      setIsGenerating(true);
      streamingTextRef.current = '';
      broadcastStreaming('');
      try {
        const currentMessages = messages ?? [];
        const history = buildMessageHistory([...currentMessages, userMessage]);
        const response = await generateResponse(history, {
          onToken: (token) => {
            streamingTextRef.current += token;
            broadcastStreaming(streamingTextRef.current);
          },
        });

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          conversationId,
          role: 'assistant',
          content: response || '응답을 생성하지 못했습니다.',
          createdAt: Date.now(),
          updatedAt: null,
          deletedAt: null,
        };
        await addMessage.mutateAsync(assistantMessage);
      } catch (err) {
        console.error('Chat response generation failed:', err);
        // Tauri invoke 실패는 문자열로 reject되고 provider 에러는
        // `AIProviderError` plain 객체라 `instanceof Error`가 아니므로
        // shape별로 메시지를 추출해야 원인이 유실되지 않는다.
        const errMessage =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : err && typeof err === 'object' && 'message' in err
                ? String((err as { message: unknown }).message)
                : '알 수 없는 오류';
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          conversationId,
          role: 'assistant',
          content: `응답 생성 중 오류가 발생했습니다: ${errMessage}`,
          createdAt: Date.now(),
          updatedAt: null,
          deletedAt: null,
        };
        await addMessage.mutateAsync(errorMessage);
      } finally {
        streamingTextRef.current = '';
        setIsGenerating(false);
      }
    },
    [conversationId, messages, addMessage, buildMessageHistory, broadcastStreaming]
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <MessageSquare className="h-6 w-6 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  const activeMessages = messages?.filter((m) => m.deletedAt === null) ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/80 px-8 py-3.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/chat' })}
          aria-label="대화 목록으로 돌아가기"
          className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          목록
        </Button>
        <div className="h-4 w-px bg-border/60" />
        <h2 className="text-sm font-semibold text-foreground">AI 지식 대화</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {activeMessages.length === 0 && !isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-muted/60 text-muted-foreground shadow-2xs">
                <MessageSquare className="h-6 w-6 opacity-70" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">메시지가 없습니다</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                저장된 지식에 대해 궁금한 점을 질문해 보세요.
              </p>
            </div>
          ) : (
            <>
              {activeMessages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {/* Streaming response bubble — a leaf holding its own token
                  state, so per-token updates skip the bubbles above. It also
                  keeps the scroll pinned while tokens grow. */}
              {isGenerating && (
                <StreamingBubble subscribe={subscribeStreaming} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} isPending={isGenerating} />
    </div>
  );
}
