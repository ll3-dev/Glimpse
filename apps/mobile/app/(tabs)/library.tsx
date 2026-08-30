import { View, Pressable } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useCallback, useState, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Plus } from '@glimpse/ui/icons';
import {
  KnowledgeItemCard,
  LibraryFilterBar,
  LibrarySearchInput,
  LibraryActiveFilterBar,
  SORT_OPTIONS,
  type SortOrder,
} from '@/src/components/library';
import { resolveLibrarySearch } from '@/src/features/library';
import { useMobileSemanticRerank } from '@/src/features/search/useMobileSemanticRerank';
import { useForegroundLabeling, useKnowledgeItemsQuery } from '@/src/hooks';
import { EmptyState, ScreenHeader } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { getDisplayLabels } from '@/src/features/labeling';
import type { KnowledgeItem } from '@glimpse/shared';
import type { LibraryFilterType } from '@/src/components/library/LibraryFilterBar';

export default function LibraryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<LibraryFilterType>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const appText = useSemanticColor('appText');
  const appBg = useSemanticColor('appBg');

  const { data: items } = useKnowledgeItemsQuery();
  useForegroundLabeling(items);

  // Extract all unique tags & labels from items
  const availableTags = useMemo(() => {
    if (!items) return [];
    const tagSet = new Set<string>();
    for (const item of items) {
      if (item.tags) {
        for (const t of item.tags) {
          tagSet.add(t);
        }
      }
      const labels = getDisplayLabels(item);
      for (const l of labels) {
        tagSet.add(l);
      }
    }
    return Array.from(tagSet);
  }, [items]);

  const { filteredItems, emptyState } = useMemo(() => {
    const searchResolved = resolveLibrarySearch(items, searchQuery);
    let result = searchResolved.filteredItems;

    // Filter by type
    if (selectedType !== 'all') {
      result = result.filter((item) => item.type === selectedType);
    }

    // Filter by tag
    if (selectedTag) {
      result = result.filter((item) => {
        const itemTags = item.tags ?? [];
        const itemLabels = getDisplayLabels(item);
        return itemTags.includes(selectedTag) || itemLabels.includes(selectedTag);
      });
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      if (sortOrder === 'oldest') {
        return a.createdAt - b.createdAt;
      }
      if (sortOrder === 'title') {
        const titleA = a.title || a.body || a.url || '';
        const titleB = b.title || b.body || b.url || '';
        return titleA.localeCompare(titleB, 'ko');
      }
      return b.createdAt - a.createdAt;
    });

    const isFiltered = selectedType !== 'all' || selectedTag !== null || Boolean(searchQuery.trim());

    return {
      ...searchResolved,
      filteredItems: result,
      emptyState:
        result.length === 0 && isFiltered
          ? {
              title: '검색 및 필터 결과가 없습니다',
              description: '선택한 조건과 일치하는 지식이 없습니다.',
            }
          : searchResolved.emptyState,
    };
  }, [items, searchQuery, selectedType, selectedTag, sortOrder]);

  const semantic = useMobileSemanticRerank(filteredItems, searchQuery);
  const rerankedItems = useMemo(
    () => (semantic.active ? sortPreservingRank(filteredItems, semantic.items) : filteredItems),
    [semantic, filteredItems]
  );

  const hasActiveFilters = selectedType !== 'all' || selectedTag !== null || Boolean(searchQuery.trim());

  function sortPreservingRank(base: KnowledgeItem[], ranked: KnowledgeItem[]): KnowledgeItem[] {
    const rank = new Map(ranked.map((item, index) => [item.id, index]));
    return [...base].sort(
      (a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );
  }

  // 정렬 칩은 탭할 때마다 SORT_OPTIONS 순서대로 다음 정렬로 순환한다 —
  // 칩 라벨과 순환 순서가 한 배열에서 함께 유지된다.
  const handleCycleSortOrder = useCallback(() => {
    setSortOrder((prev) => {
      const index = SORT_OPTIONS.findIndex((option) => option.order === prev);
      return SORT_OPTIONS[(index + 1) % SORT_OPTIONS.length].order;
    });
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedTag(null);
  }, []);

  const handleOpenItem = useCallback(
    (itemId: string) => router.push(`/library/${itemId}`),
    [router]
  );

  const handleSelectTag = useCallback((tag: string) => setSelectedTag(tag), []);

  const renderKnowledgeItem = useCallback<ListRenderItem<KnowledgeItem>>(
    ({ item }) => (
      <KnowledgeItemCard
        item={item}
        onPress={handleOpenItem}
        onSelectTag={handleSelectTag}
      />
    ),
    [handleOpenItem, handleSelectTag]
  );

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="보관함"
        subtitle={items && items.length > 0 ? `${items.length}개의 지식` : undefined}
        rightElement={
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full active:bg-app-border/40"
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="설정"
          >
            <Settings size={20} color={appText} />
          </Pressable>
        }
      />
      <LibrarySearchInput value={searchQuery} onChangeText={setSearchQuery} />

      <LibraryFilterBar
        selectedType={selectedType}
        selectedTag={selectedTag}
        availableTags={availableTags}
        sortOrder={sortOrder}
        onSelectType={setSelectedType}
        onSelectTag={setSelectedTag}
        onCycleSortOrder={handleCycleSortOrder}
      />

      {hasActiveFilters && (
        <LibraryActiveFilterBar
          itemCount={filteredItems.length}
          selectedTag={selectedTag}
          onResetFilters={handleResetFilters}
        />
      )}

      <View className="flex-1 px-6">
        <FlashList
          data={rerankedItems}
          renderItem={renderKnowledgeItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 88 }}
          contentInset={{ bottom: insets.bottom }}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState icon={BookOpen} title={emptyState.title} description={emptyState.description} />
          }
        />
      </View>

      <Pressable
        onPress={() => router.push('/capture')}
        className="absolute right-6 w-14 h-14 rounded-full bg-app-text items-center justify-center shadow-lg active:opacity-90"
        style={{ bottom: insets.bottom + 16 }}
      >
        <Plus color={appBg} size={28} />
      </Pressable>
    </View>
  );
}
