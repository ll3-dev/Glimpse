import { View, Text, Pressable } from 'react-native';
import type { Conversation } from '@glimpse/shared';

interface ConversationListProps {
  conversation: Conversation;
  onPress: (conversationId: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getInitialLetter(title: string | null): string {
  if (!title || title.trim().length === 0) return '대';
  return title.trim()[0].toUpperCase();
}

export function ConversationList({ conversation, onPress }: ConversationListProps) {
  const displayTitle = conversation.title?.trim() || '새 대화';
  const relativeTime = formatRelativeTime(conversation.updatedAt);
  const hasCustomIcon = Boolean(conversation.icon);

  return (
    <Pressable
      className="flex-row items-center p-3.5 bg-app-surface border border-app-border rounded-xl mb-2.5 active:opacity-75 shadow-xs"
      onPress={() => onPress(conversation.id)}
    >
      <View className="w-9 h-9 rounded-lg bg-app-bg items-center justify-center mr-3">
        {hasCustomIcon ? (
          <Text className="text-base">{conversation.icon}</Text>
        ) : (
          <Text className="text-xs font-bold text-app-muted">
            {getInitialLetter(conversation.title)}
          </Text>
        )}
      </View>
      <View className="flex-1 min-w-0">
        <Text
          className="text-sm font-semibold text-app-text tracking-tight"
          numberOfLines={1}
        >
          {displayTitle}
        </Text>
        <Text className="text-[11px] text-app-muted mt-0.5 font-medium">
          {relativeTime}
        </Text>
      </View>
    </Pressable>
  );
}
