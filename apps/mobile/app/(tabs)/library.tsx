import { View, TouchableOpacity, ScrollView, Text } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useState, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings, ArrowUpDown, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Plus } from "@glimpse/ui/icons";
import {
  EmptyLibraryState,
  KnowledgeItemCard,
  LibrarySearchInput,
} from "@/src/components/library";
import { resolveLibrarySearch } from "@/src/features/library";
import { useForegroundLabeling, useKnowledgeItemsQuery } from "@/src/hooks";
import { ScreenHeader } from "@glimpse/ui/primitives";
import { getDisplayLabels } from "@/src/features/labeling";
import type { KnowledgeItemType } from "@glimpse/shared";

type FilterType = 'all' | KnowledgeItemType;
type SortOrder = 'latest' | 'oldest' | 'title';

const FILTER_OPTIONS: { type: FilterType; label: string }[] = [
  { type: 'all', label: '전체' },
  { type: 'note', label: '메모' },
  { type: 'link', label: '링크' },
  { type: 'highlight', label: '하이라이트' },
  { type: 'screenshot', label: '스크린샷' },
  { type: 'share', label: '공유' },
];

const SORT_OPTIONS: { order: SortOrder; label: string }[] = [
  { order: 'latest', label: '최신순' },
  { order: 'oldest', label: '과거순' },
  { order: 'title', label: '가나다순' },
];

export default function LibraryScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<FilterType>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  const [showSortPicker, setShowSortPicker] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
      // default 'latest'
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

  const hasActiveFilters = selectedType !== 'all' || selectedTag !== null || Boolean(searchQuery.trim());

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedTag(null);
  };

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="보관함"
        subtitle={`${items?.length || 0}개의 지식`}
        rightElement={
          <View className="flex-row items-center gap-1">
            <TouchableOpacity
              className="p-2 active:opacity-70"
              onPress={() => setShowSortPicker((prev) => !prev)}
              accessibilityLabel="정렬"
            >
              <ArrowUpDown size={20} color={sortOrder !== 'latest' ? '#2383e2' : '#37352f'} />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-2 -mr-2 active:opacity-70"
              onPress={() => router.push('/settings')}
            >
              <Settings size={24} color="#37352f" />
            </TouchableOpacity>
          </View>
        }
      />
      <LibrarySearchInput value={searchQuery} onChangeText={setSearchQuery} />

      {/* Sort options bar (when toggled) */}
      {showSortPicker && (
        <View className="px-6 pb-2.5 flex-row items-center gap-2">
          <Text className="text-xs font-semibold text-app-muted mr-1">정렬:</Text>
          {SORT_OPTIONS.map((opt) => {
            const isActive = sortOrder === opt.order;
            return (
              <TouchableOpacity
                key={opt.order}
                onPress={() => {
                  setSortOrder(opt.order);
                  setShowSortPicker(false);
                }}
                className={`px-2.5 py-1 rounded-md border ${
                  isActive
                    ? 'bg-app-text border-app-text'
                    : 'bg-app-surface border-app-border'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isActive ? 'text-white' : 'text-app-muted'
                  }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Unified Filter Row */}
      <View className="pb-2.5">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 6, alignItems: 'center' }}
        >
          {FILTER_OPTIONS.map((filter) => {
            const isActive = selectedType === filter.type && selectedTag === null;
            return (
              <TouchableOpacity
                key={filter.type}
                onPress={() => {
                  setSelectedType(filter.type);
                  setSelectedTag(null);
                }}
                activeOpacity={0.7}
                className={`px-3 py-1.5 rounded-md border ${
                  isActive
                    ? 'bg-app-text border-app-text'
                    : 'bg-app-surface border-app-border active:bg-app-bg'
                }`}
              >
                <Text
                  className={`text-xs font-medium tracking-tight ${
                    isActive ? 'text-white' : 'text-app-muted'
                  }`}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {availableTags.length > 0 && <View className="h-4 w-px bg-app-border mx-1" />}

          {availableTags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => {
                  setSelectedTag(isSelected ? null : tag);
                  setSelectedType('all');
                }}
                activeOpacity={0.7}
                className={`px-2.5 py-1.5 rounded-md border ${
                  isSelected
                    ? 'bg-app-text border-app-text'
                    : 'bg-app-surface border-app-border active:bg-app-bg'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isSelected ? 'text-white font-semibold' : 'text-app-muted'
                  }`}
                >
                  #{tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Filter Indicator & Reset */}
      {hasActiveFilters && (
        <View className="px-6 pb-2 flex-row items-center justify-between">
          <Text className="text-xs text-app-muted">
            {filteredItems.length}개 항목 표시 중
            {selectedTag ? ` · #${selectedTag}` : ''}
          </Text>
          <TouchableOpacity
            onPress={handleResetFilters}
            className="flex-row items-center py-0.5 px-2 rounded bg-app-border/40"
          >
            <X size={11} color="#787774" className="mr-1" />
            <Text className="text-[11px] font-medium text-app-muted">필터 초기화</Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="flex-1 px-6">
        <FlashList
          data={filteredItems}
          renderItem={({ item }) => (
            <KnowledgeItemCard
              item={item}
              onPress={() => router.push(`/library/${item.id}`)}
              onSelectTag={(tag) => setSelectedTag(tag)}
            />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={<EmptyLibraryState {...emptyState} />}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push("/capture")}
        className="absolute right-6 w-14 h-14 rounded-full bg-black items-center justify-center shadow-lg"
        style={{ bottom: insets.bottom + 16 }}
      >
        <Plus color="white" size={30} />
      </TouchableOpacity>
    </View>
  );
}
