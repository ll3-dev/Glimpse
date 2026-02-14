import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Link, Search } from 'lucide-react-native';
import { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getAllKnowledgeItems,
  type GetItemsFailureResult,
} from '../../src/features/library';
import { filterKnowledgeItems, parseQueryToKeyword } from '../../src/features/search';
import type { KnowledgeItem } from '../../src/db';

/**
 * Library Screen
 *
 * Displays all saved knowledge items (notes and links) in a list.
 * Items are ordered by creation date, newest first.
 */
export default function LibraryScreen() {
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Query all knowledge items
  const {
    data: items,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['knowledgeItems'],
    queryFn: async () => {
      const result = await getAllKnowledgeItems();
      if (!result.success) {
        const failure = result as GetItemsFailureResult;
        const detailMessage =
          typeof failure.error.details === 'string'
            ? failure.error.details
            : failure.error.details
              ? JSON.stringify(failure.error.details)
              : '';
        const message = detailMessage
          ? `${failure.error.message}: ${detailMessage}`
          : failure.error.message;
        throw new Error(message);
      }
      return result.data;
    },
  });

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!items) return [];
    const keyword = parseQueryToKeyword(searchQuery);
    return filterKnowledgeItems(items, keyword);
  }, [items, searchQuery]);

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-app-surface" edges={['top']}>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-base text-app-muted">로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-app-surface" edges={['top']}>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="mb-2 text-center text-base text-app-muted">
            {error instanceof Error ? error.message : '오류가 발생했습니다'}
          </Text>
          <TouchableOpacity
            className="mt-4 rounded-lg bg-app-primary px-6 py-3"
            onPress={() => refetch()}
          >
            <Text className="text-[15px] font-semibold text-white">다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render empty state
  if (!items || items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-app-surface" edges={['top']}>
        <View className="p-6 pb-2">
          <Text className="text-3xl font-bold text-app-text">라이브러리</Text>
        </View>
        <View className="flex-1 items-center justify-center p-10">
          <View className="mb-4">
            <FileText size={48} color="#9ca3af" />
          </View>
          <Text className="mb-2 text-center text-base text-app-muted">저장된 항목이 없습니다</Text>
          <Text className="text-center text-sm text-app-subtle">
            메모나 링크를 저장하면 여기에 표시됩니다
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const showNoResults = filteredItems.length === 0 && searchQuery.trim().length > 0;

  return (
    <SafeAreaView className="flex-1 bg-app-surface" edges={['top']}>
      <View className="p-6 pb-2">
        <Text className="text-3xl font-bold text-app-text">라이브러리</Text>
        <Text className="mt-1 text-sm text-app-muted">
          {showNoResults
            ? '검색 결과가 없습니다'
            : `${filteredItems.length}개의 항목이 있습니다`}
        </Text>
      </View>

      <View className="px-6 pb-4 pt-2">
        <View className="flex-row items-center rounded-lg bg-app-bg px-3 py-2">
          <View className="mr-2">
            <Search size={18} color="#9ca3af" />
          </View>
          <TextInput
            className="m-0 flex-1 p-0 text-[15px] text-app-text"
            placeholder="검색..."
            placeholderTextColorClassName="text-app-subtle"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {showNoResults ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="mb-2 text-center text-base text-app-muted">
            &apos;{searchQuery}&apos;에 대한 결과가 없습니다
          </Text>
        </View>
      ) : (
        <View className="flex-1 px-4">
          <FlashList
            data={filteredItems}
            renderItem={({ item }) => <KnowledgeItemCard item={item} />}
            estimatedItemSize={100}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListHeaderComponent={<View className="h-2" />}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function KnowledgeItemCard({ item }: { item: KnowledgeItem }) {
  const displayTitle = item.title || item.body || item.url || '제목 없음';
  const truncatedTitle =
    displayTitle.length > 100 ? displayTitle.substring(0, 100) + '...' : displayTitle;
  const timeAgo = formatDistanceToNow(item.createdAt, { locale: ko, addSuffix: true });
  const TypeIcon = item.type === 'note' ? FileText : Link;

  return (
    <TouchableOpacity 
      className="mb-1 flex-row items-start rounded-lg p-3 active:bg-app-bg"
      activeOpacity={0.6}
    >
      <View className="mr-3 mt-1 h-8 w-8 items-center justify-center rounded bg-app-bg">
        <TypeIcon size={18} color="#6b7280" />
      </View>
      <View className="flex-1 border-b border-app-border pb-3">
        <Text className="mb-1 text-[16px] font-medium leading-tight text-app-text" numberOfLines={2}>
          {truncatedTitle}
        </Text>
        <Text className="text-[12px] text-app-subtle">{timeAgo}</Text>
      </View>
    </TouchableOpacity>
  );
}
