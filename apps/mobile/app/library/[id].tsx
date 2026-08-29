import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, MessageCircle } from 'lucide-react-native';
import {
  Alert,
  ScrollView,
  Text,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useKnowledgeItemsQuery,
  useDeleteKnowledgeItemMutation,
  useCreateConversationMutation,
} from '@/src/hooks';
import { getDisplayLabels } from '@/src/features/labeling';
import { ScreenHeader } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import {
  EditKnowledgeItemModal,
  KnowledgeItemDetailCard,
  LibraryDetailHeaderActions,
} from '@/src/components/library';
import { toast } from '@/src/stores/toast.store';

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default function LibraryDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const itemId = readParam(params.id);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const appText = useSemanticColor('appText');

  const { data: items, isLoading } = useKnowledgeItemsQuery();
  const { mutate: deleteItem, isPending: isDeleting } = useDeleteKnowledgeItemMutation();
  const { mutate: createConversation, isPending: isCreatingChat } = useCreateConversationMutation();

  const item = items?.find((entry) => entry.id === itemId);
  const showLoading = isLoading;
  const showMissing = !isLoading && !item;
  const showItem = !isLoading && Boolean(item);
  const displayLabels = item ? getDisplayLabels(item) : [];

  const handleDelete = () => {
    if (!item || isDeleting) return;

    Alert.alert(
      '기록 삭제',
      '이 기록을 정말 삭제하시겠습니까?\n삭제된 내용은 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteItem(
              { itemId: item.id },
              {
                onSuccess: () => {
                  toast.success('기록이 삭제되었습니다');
                  router.back();
                },
                onError: (error) => {
                  Alert.alert('삭제 실패', error.message);
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleStartChat = () => {
    if (!item || isCreatingChat) return;

    createConversation(
      {
        title: item.title || '새 대화',
        contextItemId: item.id,
      },
      {
        onSuccess: (conv) => {
          router.push({
            pathname: '/chat/[id]',
            params: { id: conv.id, contextItem: item.id },
          });
        },
        onError: (error) => {
          Alert.alert('대화 시작 실패', error.message);
        },
      }
    );
  };

  const handleCopyContent = async () => {
    if (!item) return;
    const fullText = [item.title, item.body, item.url].filter(Boolean).join('\n\n');
    await Clipboard.setStringAsync(fullText);
    toast.success('기록 내용이 클립보드에 복사되었습니다');
  };

  return (
    <View className="bg-app-bg flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="보관함 상세"
        leftElement={
          <Pressable onPress={() => router.back()} className="-ml-2 p-2">
            <ArrowLeft size={24} color={appText} />
          </Pressable>
        }
        rightElement={
          item ? (
            <LibraryDetailHeaderActions
              onCopy={handleCopyContent}
              onEdit={() => setIsEditModalOpen(true)}
              onDelete={handleDelete}
              isDeleting={isDeleting}
            />
          ) : undefined
        }
      />

      {showLoading && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-app-muted text-base">불러오는 중...</Text>
        </View>
      )}

      {showMissing && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-app-muted text-base">
            항목을 찾을 수 없습니다.
          </Text>
        </View>
      )}

      {showItem && item && (
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 40 }}
          contentInset={{ bottom: insets.bottom }}
        >
          <KnowledgeItemDetailCard item={item} displayLabels={displayLabels} />

          {/* AI Chat Action CTA */}
          <Pressable
            onPress={handleStartChat}
            disabled={isCreatingChat}
            className="flex-row items-center justify-center bg-app-text rounded-full py-3.5 px-6 shadow-sm active:opacity-85"
          >
            <MessageCircle size={16} color="white" className="mr-2" />
            <Text className="text-sm font-semibold text-white">
              {isCreatingChat ? '대화 준비 중...' : '이 항목으로 AI와 대화하기'}
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Edit Modal */}
      <EditKnowledgeItemModal
        visible={isEditModalOpen}
        item={item ?? null}
        onClose={() => setIsEditModalOpen(false)}
      />
    </View>
  );
}
