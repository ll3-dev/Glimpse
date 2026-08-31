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
import { EmptyState, ScreenHeader, Skeleton } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { ConversationList } from '@/src/components/chat';
import { FlashList } from "@shopify/flash-list";
import { useCallback } from 'react';
import type { Conversation } from '@glimpse/shared';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const appBg = useSemanticColor('appBg');

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
              className="flex-row items-center bg-app-text px-3 py-1.5 rounded-full active:opacity-80"
              onPress={handleCreateConversation}
              disabled={isCreating}
            >
              <Plus size={14} color={appBg} strokeWidth={3} />
              <Text className="ml-1.5 text-xs font-bold text-app-bg">
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
              className="flex-row items-center p-4 bg-app-surface border border-app-border rounded-xl mb-2.5"
            >
              <Skeleton width={36} height={36} radius={8} />
              <View className="flex-1 ml-3.5">
                <Skeleton width="65%" height={16} className="mb-1.5" radius={4} />
                <Skeleton width={80} height={12} radius={4} />
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
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            contentInset={{ bottom: insets.bottom }}
          />
        </View>
      )}

      {/* Empty state */}
      {showEmpty && (
        <EmptyState
          icon={MessageCircle}
          title="새 대화를 시작하세요"
          description={"AI와 자유롭게 대화하거나\n보관함 항목에 대해 질문해 보세요"}
          action={{
            label: "새 대화 시작",
            onPress: handleCreateConversation,
            disabled: isCreating,
            pendingLabel: "생성 중...",
            icon: Plus,
          }}
        />
      )}
    </View>
  );
}
