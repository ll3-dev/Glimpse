import React, { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Trash2,
  Sparkles,
  MessageCircle,
  FileText,
  Link as LinkIcon,
  Highlighter,
  Image as ImageIcon,
  Share2,
  Copy,
} from 'lucide-react-native';
import {
  Alert,
  Linking,
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
import { formatKnowledgeLabel, getDisplayLabels } from '@/src/features/labeling';
import { Card, ScreenHeader } from '@glimpse/ui/primitives';
import { EditKnowledgeItemModal } from '@/src/components/library';
import { toast } from '@/src/stores/toast.store';
import type { KnowledgeItem } from '@glimpse/shared';

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

const TYPE_CONFIG: Record<
  KnowledgeItem['type'],
  { label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }
> = {
  note: { label: '메모', Icon: FileText },
  link: { label: '링크', Icon: LinkIcon },
  highlight: { label: '하이라이트', Icon: Highlighter },
  screenshot: { label: '스크린샷', Icon: ImageIcon },
  share: { label: '공유', Icon: Share2 },
};

function getTypeConfig(type: KnowledgeItem['type']) {
  return TYPE_CONFIG[type] ?? { label: '항목', Icon: FileText };
}

export default function LibraryDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const itemId = readParam(params.id);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const typeConfig = item ? getTypeConfig(item.type) : { label: '항목', Icon: FileText };
  const TypeIcon = typeConfig.Icon;

  return (
    <View className="bg-app-bg flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="보관함 상세"
        leftElement={
          <Pressable onPress={() => router.back()} className="-ml-2 p-2">
            <ArrowLeft size={24} color="#37352f" />
          </Pressable>
        }
        rightElement={
          item ? (
            <View className="flex-row items-center gap-1">
              <Pressable
                onPress={handleCopyContent}
                className="p-2 active:opacity-70"
                accessibilityLabel="복사"
              >
                <Copy size={18} color="#787774" />
              </Pressable>
              <Pressable
                onPress={() => setIsEditModalOpen(true)}
                className="p-2 active:opacity-70"
                accessibilityLabel="수정"
              >
                <Pencil size={18} color="#787774" />
              </Pressable>
              <Pressable
                onPress={handleDelete}
                disabled={isDeleting}
                className="p-2 -mr-2 active:opacity-70"
                accessibilityLabel="삭제"
              >
                <Trash2 size={18} color="#eb5757" />
              </Pressable>
            </View>
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
          {/* Main Editorial Card */}
          <Card className="p-5 mb-4">
            {/* Header Meta */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-1.5 rounded-full bg-app-border/40 px-2.5 py-1">
                <TypeIcon size={13} color="#787774" />
                <Text className="text-xs font-semibold text-app-muted tracking-tight">
                  {typeConfig.label}
                </Text>
              </View>
              <Text className="text-app-subtle text-xs font-medium">
                {format(item.createdAt, 'yyyy.MM.dd HH:mm', { locale: ko })}
              </Text>
            </View>

            {/* Title */}
            <Text className="text-app-text text-xl font-bold leading-tight mb-4">
              {item.title || item.body || item.url || '제목 없음'}
            </Text>

            {/* Body */}
            {item.body && (
              <View className="mb-4">
                <Text className="text-app-text text-sm leading-6 select-text">
                  {item.body}
                </Text>
              </View>
            )}

            {/* URL Link */}
            {item.url && (
              <Pressable
                className="flex-row items-center justify-between bg-app-bg border border-app-border rounded-md px-3.5 py-2.5 mb-4 active:opacity-80"
                onPress={() => item.url && Linking.openURL(item.url)}
              >
                <Text
                  className="flex-1 text-sm text-app-primary font-medium mr-2"
                  numberOfLines={2}
                >
                  {item.url}
                </Text>
                <ExternalLink size={14} color="#2383e2" />
              </Pressable>
            )}

            {/* AI Summary Callout */}
            {item.summary && (
              <View className="bg-tag-lavender-bg/30 border border-tag-lavender-text/20 rounded-md p-3.5 mb-4">
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <Sparkles size={14} color="#6e3ab7" />
                  <Text className="text-xs font-semibold text-tag-lavender-text">
                    AI 요약
                  </Text>
                </View>
                <Text className="text-app-text text-xs leading-5">
                  {item.summary}
                </Text>
              </View>
            )}

            {/* Tags & Labels Section */}
            {(displayLabels.length > 0 || (item.tags && item.tags.length > 0)) && (
              <View className="pt-3 border-t border-app-border/60 flex-row flex-wrap gap-1.5 items-center">
                {displayLabels.map((label) => (
                  <View
                    key={label}
                    className="bg-tag-mint-bg/60 rounded px-2 py-0.5"
                  >
                    <Text className="text-tag-mint-text text-[11px] font-medium">
                      {formatKnowledgeLabel(label)}
                    </Text>
                  </View>
                ))}
                {item.tags?.map((tag) => (
                  <View
                    key={tag}
                    className="bg-app-border/40 rounded px-2 py-0.5"
                  >
                    <Text className="text-app-muted text-[11px] font-medium">
                      #{tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* AI Chat Action CTA */}
          <Pressable
            onPress={handleStartChat}
            disabled={isCreatingChat}
            className="flex-row items-center justify-center bg-app-text rounded-md py-3.5 px-4 shadow-sm active:opacity-90"
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
