import { View, Text, Pressable } from 'react-native';

export type SortOrder = 'latest' | 'oldest' | 'title';

export const SORT_OPTIONS: { order: SortOrder; label: string }[] = [
  { order: 'latest', label: '최신순' },
  { order: 'oldest', label: '과거순' },
  { order: 'title', label: '가나다순' },
];

interface LibrarySortPickerProps {
  sortOrder: SortOrder;
  onSelectSortOrder: (order: SortOrder) => void;
}

export function LibrarySortPicker({
  sortOrder,
  onSelectSortOrder,
}: LibrarySortPickerProps) {
  return (
    <View className="px-6 pb-2.5 flex-row items-center gap-2">
      <Text className="text-xs font-semibold text-app-muted mr-1">정렬:</Text>
      {SORT_OPTIONS.map((opt) => {
        const isActive = sortOrder === opt.order;
        return (
          <Pressable
            key={opt.order}
            onPress={() => onSelectSortOrder(opt.order)}
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
          </Pressable>
        );
      })}
    </View>
  );
}
