/**
 * Chat Screen
 *
 * Displays list of conversations and allows creating new ones.
 */

import { Activity, useCallback } from "react";
import { View, TouchableOpacity, Text, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, MessageCircle } from 'lucide-react-native';
import { useConversationsQuery, useCreateConversationMutation } from '@/src/hooks';
import { ScreenHeader } from '@/src/ui/primitives';
import { ConversationList } from '@/src/components/chat';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: conversations } = useConversationsQuery();
  const { mutate: createConversation, isPending: isCreating } = useCreateConversationMutation();

  const handleCreateConversation = () => {
    createConversation(undefined, {
      onSuccess: (conversation) => {
        router.push(`/chat/${conversation.id}`);
      },
      onError: (error) => {
        console.error("Failed to create conversation:", error);
      },
    });
  };

  const handleSelectConversation = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);
    },
    [router],
  );

  const hasConversations = conversations && conversations.length > 0;
  const renderConversationItem = useCallback(
    ({ item }: { item: NonNullable<typeof conversations>[number] }) => (
      <ConversationList
        conversation={item}
        onPress={() => handleSelectConversation(item.id)}
      />
    ),
    [handleSelectConversation],
  );

  return (
    <View className="bg-app-bg flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="채팅"
        subtitle={
          conversations ? `${conversations.length}개의 대화` : undefined
        }
      />

      <Activity mode={hasConversations ? "visible" : "hidden"}>
        <View className="flex-1 px-4">
          <FlatList
            data={conversations}
            renderItem={renderConversationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          />
        </View>
      </Activity>

      <Activity mode={hasConversations ? "hidden" : "visible"}>
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
