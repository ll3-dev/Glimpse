import { useEffect, useRef } from 'react';
import { useMessagesQuery, useAddMessageMutation } from '@glimpse/hooks';
import type { Message } from '@glimpse/shared';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { generateResponse } from '@/features/ai/chat-generation';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';

interface ChatViewProps {
  conversationId: string;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const { data: messages, isLoading } = useMessagesQuery(conversationId);
  const addMessage = useAddMessageMutation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Auto-scroll to bottom when messages or streaming content changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

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
      setStreamingContent('');
      try {
        const currentMessages = messages ?? [];
        const history = buildMessageHistory([...currentMessages, userMessage]);
        const response = await generateResponse(history, {
          onToken: (token) => {
            setStreamingContent((prev) => prev + token);
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
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          conversationId,
          role: 'assistant',
          content: `응답 생성 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
          createdAt: Date.now(),
          updatedAt: null,
          deletedAt: null,
        };
        await addMessage.mutateAsync(errorMessage);
      } finally {
        setStreamingContent('');
        setIsGenerating(false);
      }
    },
    [conversationId, messages, addMessage, buildMessageHistory]
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
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate({ to: '/chat' })}
          aria-label="Back to conversations"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium text-foreground">Conversation</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {activeMessages.length === 0 && !streamingContent ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="h-8 w-8" />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {/* Streaming response bubble */}
            {streamingContent && (
              <div className="flex w-full justify-start">
                <div className="max-w-[75%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {streamingContent}
                    <span className="inline-block w-[2px] animate-pulse bg-foreground align-text-bottom ml-0.5" style={{ height: '1em' }} />
                  </p>
                </div>
              </div>
            )}
            {/* Generating indicator when no tokens have arrived yet */}
            {isGenerating && !streamingContent && (
              <div className="flex w-full justify-start">
                <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5">
                  <span className="inline-block w-[2px] animate-pulse bg-foreground" style={{ height: '1em' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} isPending={isGenerating} />
    </div>
  );
}
