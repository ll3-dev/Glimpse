import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Text } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { ChatMarkdown } from './ChatMarkdown';
import type { ParsedChatMessageContent } from '@/src/features/chat';

interface ChatMessageReasoningProps {
  parsedContent: ParsedChatMessageContent;
}

export function ChatMessageReasoning({ parsedContent }: ChatMessageReasoningProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const appMuted = useSemanticColor('appMuted');

  if (!parsedContent.reasoning) return null;

  return (
    <View className="mb-3 rounded-lg bg-app-bg/60 border border-app-border/80 px-3.5 py-2.5">
      <Pressable
        onPress={() => setShowReasoning((prev) => !prev)}
        className="flex-row items-center justify-between"
      >
        <View className="flex-1 pr-3">
          <Text className="text-[10px] font-bold tracking-wider text-app-muted uppercase">
            {parsedContent.isReasoningInProgress
              ? '사고 중'
              : '사고 요약'}
          </Text>
          <Text
            className="mt-0.5 text-xs text-app-text font-medium leading-4"
            numberOfLines={showReasoning ? undefined : 2}
          >
            {parsedContent.reasoningSummary ?? '생각을 정리하고 있습니다.'}
          </Text>
        </View>
        {showReasoning ? (
          <ChevronUp size={15} color={appMuted} />
        ) : (
          <ChevronDown size={15} color={appMuted} />
        )}
      </Pressable>
      {showReasoning && (
        <View className="mt-2.5 pt-2 border-t border-app-border/60">
          <ChatMarkdown
            content={parsedContent.reasoning}
            textClassName="text-app-text text-xs leading-5"
            mutedTextClassName="text-app-muted text-xs leading-5"
          />
        </View>
      )}
    </View>
  );
}
