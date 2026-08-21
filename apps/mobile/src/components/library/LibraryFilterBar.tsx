import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, Text, View, type ListRenderItem } from 'react-native';
import type { KnowledgeItemType } from '@glimpse/shared';

export type LibraryFilterType = 'all' | KnowledgeItemType;

type FilterChip =
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
  onSelectType: (type: LibraryFilterType) => void;
  onSelectTag: (tag: string | null) => void;
}

export function LibraryFilterBar({
  selectedType,
  selectedTag,
  availableTags,
  onSelectType,
  onSelectTag,
}: LibraryFilterBarProps) {
  const chips = useMemo<FilterChip[]>(
    () => [
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
    [availableTags]
  );

  const renderChip = useCallback<ListRenderItem<FilterChip>>(
    ({ item }) => {
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
    [onSelectTag, onSelectType, selectedTag, selectedType]
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
