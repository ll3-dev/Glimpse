/**
 * ChatMessage Component
 *
 * Displays a single message bubble in the chat.
 */

import { View, Text } from 'react-native';
import type { Message } from '@/src/db';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <View
      className={`flex-row mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <View
        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-black rounded-br-md'
            : 'bg-gray-100 rounded-bl-md'
        }`}
      >
        <Text
          className={`text-base leading-5 ${
            isUser ? 'text-white' : 'text-gray-900'
          }`}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}
