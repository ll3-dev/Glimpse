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

export function MessageBubble({ message }: MessageBubbleProps) {
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
}
