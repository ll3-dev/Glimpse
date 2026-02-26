/**
 * Chat Screen
 *
 * Displays list of conversations and allows creating new ones.
 */

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
    });
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/chat/${id}`);
  };

  const hasConversations = conversations && conversations.length > 0;

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="채팅"
        subtitle={conversations ? `${conversations.length}개의 대화` : undefined}
      />

      {hasConversations ? (
        <View className="flex-1 px-4">
          <FlatList
            data={conversations}
            renderItem={({ item }) => (
              <ConversationList
                conversation={item}
                onPress={() => handleSelectConversation(item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          />
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
            <MessageCircle size={32} color="#9ca3af" />
          </View>
          <Text className="text-lg font-medium text-gray-900 mb-2">
            새 대화를 시작하세요
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-6">
            AI와 자유롭게 대화하거나{"\n"}보관함 항목에 대해 질문해 보세요
          </Text>
          <TouchableOpacity
            className="flex-row items-center bg-black px-6 py-3 rounded-full"
            onPress={handleCreateConversation}
            disabled={isCreating}
          >
            <Plus size={20} color="white" />
            <Text className="text-white font-medium ml-2">
              {isCreating ? '생성 중...' : '새 대화'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
