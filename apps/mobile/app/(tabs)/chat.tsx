/**
 * Chat Screen
 *
 * Displays list of conversations and allows creating new ones.
 */

import { View, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, MessageCircle } from 'lucide-react-native';
import { useConversationsQuery, useCreateConversationMutation } from '@/src/hooks';
import { ScreenHeader, Skeleton } from '@glimpse/ui/primitives';
import { ConversationList } from '@/src/components/chat';
import { FlashList } from "@shopify/flash-list";
import { useCallback } from 'react';
import type { Conversation } from '@glimpse/shared';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: conversations, isLoading } = useConversationsQuery();
  const { mutate: createConversation, isPending: isCreating } = useCreateConversationMutation();

  const handleCreateConversation = useCallback(() => {
    createConversation({}, {
      onSuccess: (conversation) => {
        router.push(`/chat/${conversation.id}`);
      },
      onError: (error) => {
        console.error("Failed to create conversation:", error);
      },
    });
  }, [createConversation, router]);

  const handleOpenConversation = useCallback(
    (conversationId: string) => router.push(`/chat/${conversationId}`),
    [router]
  );

  const renderConversation = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationList conversation={item} onPress={handleOpenConversation} />
    ),
    [handleOpenConversation]
  );

  const showLoading = isLoading;
  const showEmpty = !isLoading && (!conversations || conversations.length === 0);
  const showData = !isLoading && conversations && conversations.length > 0;

  return (
    <View className="bg-app-bg flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="채팅"
        subtitle={
          isLoading
            ? "로딩 중..."
            : conversations
              ? `${conversations.length}개의 대화`
              : undefined
        }
        rightElement={
          showData ? (
            <Pressable
              className="flex-row items-center bg-black px-3 py-1.5 rounded-full"
              onPress={handleCreateConversation}
              disabled={isCreating}
            >
              <Plus size={14} color="white" strokeWidth={3} />
              <Text className="ml-1.5 text-xs font-bold text-white">
                {isCreating ? "생성 중" : "새 대화"}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* Loading skeleton */}
      {showLoading && (
        <View className="flex-1 px-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              className="flex-row items-center p-4 bg-app-surface border border-app-border rounded-md mb-2"
            >
              <Skeleton width={40} height={40} radius={20} />
              <View className="flex-1 ml-3">
                <Skeleton width="70%" height={16} className="mb-1" />
                <Skeleton width={60} height={12} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Conversation list */}
      {showData && (
        <View className="flex-1 px-6">
          <FlashList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            contentInset={{ bottom: insets.bottom }}
          />
        </View>
      )}

      {/* Empty state */}
      {showEmpty && (
        <View className="flex-1 items-center justify-center py-24 px-6">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-app-border/40">
            <MessageCircle size={24} color="#787774" />
          </View>
          <Text className="mb-2 text-base font-semibold text-app-text tracking-tight text-center">
            새 대화를 시작하세요
          </Text>
          <Text className="mb-6 text-center text-sm text-app-muted leading-relaxed">
            AI와 자유롭게 대화하거나{"\n"}보관함 항목에 대해 질문해 보세요
          </Text>
          <Pressable
            className="flex-row items-center rounded-md bg-app-text px-5 py-2.5 active:opacity-90"
            onPress={handleCreateConversation}
            disabled={isCreating}
          >
            <Plus size={16} color="white" />
            <Text className="ml-2 font-medium text-sm text-white">
              {isCreating ? "생성 중..." : "새 대화 시작"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
