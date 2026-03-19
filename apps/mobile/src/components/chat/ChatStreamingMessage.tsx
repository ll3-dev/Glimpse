import { View } from 'react-native';
import { Text } from '@glimpse/ui/primitives';
import { ChatMarkdown } from './ChatMarkdown';
import { parseChatMessageContent } from './chatMessageContent';

type ChatStreamingMessageProps = {
  content: string;
};

export function ChatStreamingMessage({ content }: ChatStreamingMessageProps) {
  const parsedContent = parseChatMessageContent(content);

  return (
    <View className="mb-3 flex-row justify-start">
      <View className="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
        {content ? (
          parsedContent.answer ? (
            <>
              {parsedContent.reasoning && (
                <View className="mb-3 rounded-xl bg-white/70 px-3 py-2">
                  <Text className="text-xs font-semibold uppercase tracking-tight text-gray-500">
                    {parsedContent.isReasoningInProgress ? '사고 중' : '사고 요약'}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-700" numberOfLines={2}>
                    {parsedContent.reasoningSummary ?? '생각을 정리하고 있습니다.'}
                  </Text>
                </View>
              )}
              <ChatMarkdown
                content={parsedContent.answer}
                textClassName="text-gray-900 text-base leading-6"
                mutedTextClassName="text-gray-700 text-sm leading-5"
              />
            </>
          ) : (
            <View className="rounded-xl bg-white/70 px-3 py-2">
              <Text className="text-xs font-semibold uppercase tracking-tight text-gray-500">
                사고 중
              </Text>
              <Text className="mt-1 text-sm text-gray-700" numberOfLines={2}>
                {parsedContent.reasoningSummary ?? '생각을 정리하고 있습니다.'}
              </Text>
            </View>
          )
        ) : (
          <Text className="text-gray-500">생각 중...</Text>
        )}
      </View>
    </View>
  );
}
