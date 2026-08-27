import { memo } from 'react';
import type { Message } from '@glimpse/shared';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// memo: 스트리밍 중 토큰마다 ChatView가 재렌더되지만, 확정된 메시지 버블의
// prop(message 참조)은 불변 — 재렌더를 건너뛰게 한다.
export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md bg-muted text-foreground'
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
        <span
          className={cn(
            'mt-1 block text-xs',
            isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'
          )}
        >
          {formatTimestamp(message.createdAt)}
        </span>
      </div>
    </div>
  );
});
