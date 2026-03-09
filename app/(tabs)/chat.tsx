/**
 * Chat Screen
 *
 * Displays list of conversations and allows creating new ones.
 */

import { Activity } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, MessageCircle } from 'lucide-react-native';
import { useConversationsQuery, useCreateConversationMutation } from '@/src/hooks';
import { ScreenHeader, Skeleton } from '@/src/ui/primitives';
import { ConversationList } from '@/src/components/chat';
import { FlashList } from "@shopify/flash-list";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: conversations, isLoading } = useConversationsQuery();
  const { mutate: createConversation, isPending: isCreating } = useCreateConversationMutation();

  const handleCreateConversation = () => {
    createConversation({}, {
      onSuccess: (conversation) => {
        router.push(`/chat/${conversation.id}`);
      },
      onError: (error) => {
        console.error("Failed to create conversation:", error);
      },
    });
  };

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
          <TouchableOpacity
            className="flex-row items-center bg-black px-3 py-1.5 rounded-full"
            onPress={handleCreateConversation}
            disabled={isCreating}
            activeOpacity={0.7}
          >
            <Plus size={14} color="white" strokeWidth={3} />
            <Text className="ml-1.5 text-xs font-bold text-white">
              {isCreating ? "생성 중" : "새 대화"}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Loading skeleton */}
      <Activity mode={showLoading ? "visible" : "hidden"}>
        <View className="flex-1 px-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              className="flex-row items-center p-4 bg-white rounded-xl mb-2"
            >
              <Skeleton width={40} height={40} radius={20} />
              <View className="flex-1 ml-3">
                <Skeleton width="70%" height={16} className="mb-1" />
                <Skeleton width={60} height={12} />
              </View>
            </View>
          ))}
        </View>
      </Activity>

      {/* Conversation list */}
      <Activity mode={showData ? "visible" : "hidden"}>
        <View className="flex-1 px-4">
          <FlashList
            data={conversations}
            renderItem={({ item }) => (
              <ConversationList
                conversation={item}
                onPress={() => router.push(`/chat/${item.id}`)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          />
        </View>
      </Activity>

      {/* Empty state */}
      <Activity mode={showEmpty ? "visible" : "hidden"}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <MessageCircle size={32} color="#9ca3af" />
          </View>
          <Text className="mb-2 text-lg font-medium text-gray-900">
            새 대화를 시작하세요
          </Text>
          <Text className="mb-6 text-center text-sm text-gray-500">
            AI와 자유롭게 대화하거나{"\n"}보관함 항목에 대해 질문해 보세요
          </Text>
          <TouchableOpacity
            className="flex-row items-center rounded-full bg-black px-6 py-3"
            onPress={handleCreateConversation}
            disabled={isCreating}
          >
            <Plus size={20} color="white" />
            <Text className="ml-2 font-medium text-white">
              {isCreating ? "생성 중..." : "새 대화"}
            </Text>
          </TouchableOpacity>
        </View>
      </Activity>
    </View>
  );
}
