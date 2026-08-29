import { memo } from 'react';
import type { Message } from '@glimpse/shared';
import { cn } from '@/lib/utils';
import { ReferenceChips, type ChatReference } from './ReferenceChips';

interface MessageBubbleProps {
  message: Message;
  /** 어시스턴트 응답이 참조한 노트 — 응답 완료 시 한 번 만들어지는 안정 배열 */
  references?: ChatReference[];
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// memo: 스트리밍 중 토큰마다 ChatView가 재렌더되지만, 확정된 메시지 버블의
// prop(message 참조)은 불변 — 재렌더를 건너뛰게 한다.
export const MessageBubble = memo(function MessageBubble({
  message,
  references,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[78%] px-4 py-3 text-sm leading-relaxed shadow-2xs',
          isUser
            ? 'rounded-2xl rounded-tr-xs bg-app-text text-app-bg'
            : 'rounded-2xl rounded-tl-xs border border-border bg-card text-foreground'
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && references && <ReferenceChips references={references} />}
        <span
          className={cn(
            'mt-1.5 block text-[11px]',
            isUser ? 'text-app-bg/70' : 'text-muted-foreground'
          )}
        >
          {formatTimestamp(message.createdAt)}
        </span>
      </div>
    </div>
  );
});
