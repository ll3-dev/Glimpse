import { View, Text, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { useSemanticColor } from '@glimpse/ui';

interface LibraryActiveFilterBarProps {
  itemCount: number;
  selectedTag: string | null;
  onResetFilters: () => void;
}

export function LibraryActiveFilterBar({
  itemCount,
  selectedTag,
  onResetFilters,
}: LibraryActiveFilterBarProps) {
  const appMuted = useSemanticColor('appMuted');

  return (
    <View className="px-6 pb-2.5 flex-row items-center justify-between">
      <Text className="text-xs text-app-muted font-medium">
        {itemCount}개 항목 표시 중
        {selectedTag ? ` · #${selectedTag}` : ''}
      </Text>
      <Pressable
        onPress={onResetFilters}
        className="flex-row items-center py-1 px-2.5 rounded-lg bg-app-border/40 active:bg-app-border/70"
        accessibilityRole="button"
        accessibilityLabel="필터 초기화"
      >
        <X size={11} color={appMuted} style={{ marginRight: 4 }} />
        <Text className="text-[11px] font-semibold text-app-muted">필터 초기화</Text>
      </Pressable>
    </View>
  );
}
