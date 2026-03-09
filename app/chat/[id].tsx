/**
 * Chat Detail Screen
 *
 * Individual conversation view with AI chat.
 */

import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useRef, useCallback } from 'react';
import {
  useMessagesQuery,
  useKnowledgeItemsQuery,
} from '@/src/hooks';
import { ChatMessage, ChatInput, ContextBadge } from '@/src/components/chat';
import { useChat } from '@/src/components/chat/hooks/useChat';

export default function ChatDetailScreen() {
  const { id, contextItem: contextItemId } = useLocalSearchParams<{ id: string; contextItem?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const { data: messages, isLoading: isLoadingMessages } = useMessagesQuery(id);
  const { data: knowledgeItems } = useKnowledgeItemsQuery();

  // Find context item if provided
  const contextItem = contextItemId && knowledgeItems
    ? knowledgeItems.find((item) => item.id === contextItemId)
    : null;

  const { sendMessage, isGenerating, streamingText, abortAndSave } = useChat({
    conversationId: id,
    contextItem,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages?.length]);

  // Scroll to bottom when streaming text updates
  useEffect(() => {
    if (streamingText) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [streamingText]);

  // Handle back press during generation
  const handleBackPress = useCallback(() => {
    if (isGenerating) {
      Alert.alert(
        '응답 생성 중',
        'AI가 응답을 생성하고 있습니다. 나가면 지금까지 생성된 내용이 저장됩니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '나가기',
            style: 'destructive',
            onPress: async () => {
              await abortAndSave();
              router.back();
            },
          },
        ]
      );
      return true; // Prevent default back behavior
    }
    router.back();
    return true;
  }, [isGenerating, router, abortAndSave]);

  // Intercept hardware back button on Android
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isGenerating) {
        handleBackPress();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [isGenerating, handleBackPress]);

  const handleSend = async (text: string) => {
    await sendMessage(text);
    // Scroll to bottom after sending
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-app-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top }}
      keyboardVerticalOffset={0}
    >
      <View className="flex-row items-center px-4 py-3 bg-app-bg">
        <TouchableOpacity
          onPress={handleBackPress}
          className="p-2 -ml-2"
        >
          <ChevronLeft size={24} color="#37352f" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900 ml-2" numberOfLines={1}>
          채팅
        </Text>
      </View>

      {/* Context badge */}
      {contextItem && (
        <ContextBadge item={contextItem} />
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {isLoadingMessages ? (
          <View className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-500">로딩 중...</Text>
          </View>
        ) : messages && messages.length > 0 ? (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        ) : (
          <View className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-400 text-center">
              {contextItem
                ? '이 항목에 대해 질문해 보세요'
                : '메시지를 입력해 대화를 시작하세요'}
            </Text>
          </View>
        )}

        {/* Generating indicator / streaming response */}
        {isGenerating && (
          <View className="flex-row justify-start mb-3">
            <View className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%]">
              {streamingText ? (
                <Text className="text-gray-900 text-base leading-5">{streamingText}</Text>
              ) : (
                <Text className="text-gray-500">생각 중...</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <ChatInput onSend={handleSend} isLoading={isGenerating} />
    </KeyboardAvoidingView>
  );
}
