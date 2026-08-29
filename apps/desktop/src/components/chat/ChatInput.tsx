import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  isPending: boolean;
}

export function ChatInput({ onSend, isPending }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isPending, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, []);

  return (
    <div className="border-t border-border/80 bg-card/90 px-6 py-4 backdrop-blur-xs">
      <div className="mx-auto flex max-w-4xl items-end gap-2.5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
          aria-label="채팅 메시지 입력"
          disabled={isPending}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/75 focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20 disabled:opacity-50"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!value.trim() || isPending}
          aria-label="메시지 전송"
          className="h-10 w-10 shrink-0 rounded-xl bg-app-text text-app-bg shadow-2xs hover:opacity-90 active:scale-95 disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
