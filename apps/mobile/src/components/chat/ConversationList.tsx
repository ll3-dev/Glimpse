/**
 * ConversationList Component
 *
 * Displays a single conversation item in the list.
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import type { Conversation } from '@glimpse/shared';

interface ConversationListProps {
  conversation: Conversation;
  onPress: () => void;
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

export function ConversationList({ conversation, onPress }: ConversationListProps) {
  const displayTitle = conversation.title || '새 대화';
  const relativeTime = formatRelativeTime(conversation.updatedAt);
  const hasCustomIcon = Boolean(conversation.icon);

  return (
    <TouchableOpacity
      className="flex-row items-center p-4 bg-white rounded-xl mb-2"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
        {hasCustomIcon ? (
          <Text className="text-xl">{conversation.icon}</Text>
        ) : (
          <MessageCircle size={20} color="#6b7280" />
        )}
      </View>
      <View className="flex-1">
        <Text
          className="text-base font-medium text-gray-900"
          numberOfLines={1}
        >
          {displayTitle}
        </Text>
        <Text className="text-sm text-gray-500 mt-0.5">
          {relativeTime}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
