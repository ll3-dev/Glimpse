import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, Text, View, type ListRenderItem } from 'react-native';
import { ArrowUpDown } from 'lucide-react-native';
import { useSemanticColor } from '@glimpse/ui';
import type { KnowledgeItemType } from '@glimpse/shared';
import { type SortOrder, SORT_OPTIONS } from './LibrarySortPicker';

export type LibraryFilterType = 'all' | KnowledgeItemType;

type FilterChip =
  | { id: 'sort'; kind: 'sort'; label: string; value: SortOrder }
  | { id: string; kind: 'type'; label: string; value: LibraryFilterType }
  | { id: string; kind: 'tag'; label: string; value: string };

const FILTER_OPTIONS: { type: LibraryFilterType; label: string }[] = [
  { type: 'all', label: '전체' },
  { type: 'note', label: '메모' },
  { type: 'link', label: '링크' },
  { type: 'highlight', label: '하이라이트' },
  { type: 'screenshot', label: '스크린샷' },
  { type: 'share', label: '공유' },
];

const CONTENT_STYLE = { paddingHorizontal: 24, alignItems: 'center' } as const;

function FilterSeparator() {
  return <View className="w-1.5" />;
}

interface LibraryFilterBarProps {
  selectedType: LibraryFilterType;
  selectedTag: string | null;
  availableTags: string[];
  sortOrder: SortOrder;
  onSelectType: (type: LibraryFilterType) => void;
  onSelectTag: (tag: string | null) => void;
  onCycleSortOrder: () => void;
}

export function LibraryFilterBar({
  selectedType,
  selectedTag,
  availableTags,
  sortOrder,
  onSelectType,
  onSelectTag,
  onCycleSortOrder,
}: LibraryFilterBarProps) {
  const appMuted = useSemanticColor('appMuted');
  const appPrimary = useSemanticColor('appPrimary');

  const currentSortLabel = SORT_OPTIONS.find((s) => s.order === sortOrder)?.label ?? '정렬';

  const chips = useMemo<FilterChip[]>(
    () => [
      {
        id: 'sort',
        kind: 'sort' as const,
        label: currentSortLabel,
        value: sortOrder,
      },
      ...FILTER_OPTIONS.map((filter) => ({
        id: `type:${filter.type}`,
        kind: 'type' as const,
        label: filter.label,
        value: filter.type,
      })),
      ...availableTags.map((tag) => ({
        id: `tag:${tag}`,
        kind: 'tag' as const,
        label: `#${tag}`,
        value: tag,
      })),
    ],
    [availableTags, currentSortLabel, sortOrder]
  );

  const renderChip = useCallback<ListRenderItem<FilterChip>>(
    ({ item }) => {
      if (item.kind === 'sort') {
        const isCustomSort = sortOrder !== 'latest';
        return (
          <Pressable
            onPress={onCycleSortOrder}
            className={`flex-row items-center rounded-md border px-2.5 py-1.5 active:bg-app-bg ${
              isCustomSort
                ? 'border-app-primary/40 bg-tag-sky-bg/40'
                : 'border-app-border bg-app-surface'
            }`}
            accessibilityRole="button"
            accessibilityLabel={`정렬: ${item.label}`}
          >
            <ArrowUpDown
              size={12}
              color={isCustomSort ? appPrimary : appMuted}
              className="mr-1"
            />
            <Text
              className={`text-xs font-medium ${
                isCustomSort ? 'text-app-primary font-semibold' : 'text-app-muted'
              }`}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      }

      const isActive =
        item.kind === 'type'
          ? selectedType === item.value && selectedTag === null
          : selectedTag === item.value;

      return (
        <Pressable
          onPress={() => {
            if (item.kind === 'type') {
              onSelectType(item.value);
              onSelectTag(null);
              return;
            }

            onSelectTag(isActive ? null : item.value);
            onSelectType('all');
          }}
          className={`rounded-md border px-3 py-1.5 ${
            isActive
              ? 'border-app-text bg-app-text'
              : 'border-app-border bg-app-surface active:bg-app-bg'
          }`}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
        >
          <Text
            className={`text-xs font-medium tracking-tight ${
              isActive ? 'text-white' : 'text-app-muted'
            }`}
          >
            {item.label}
          </Text>
        </Pressable>
      );
    },
    [appMuted, appPrimary, onCycleSortOrder, onSelectTag, onSelectType, selectedTag, selectedType, sortOrder]
  );

  return (
    <View className="pb-2.5">
      <FlatList
        horizontal
        data={chips}
        renderItem={renderChip}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={FilterSeparator}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={CONTENT_STYLE}
      />
    </View>
  );
}
