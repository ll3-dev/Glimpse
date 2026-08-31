import { View, Text, Pressable } from 'react-native';
import { Network, X } from 'lucide-react-native';
import { useSemanticColor } from '@glimpse/ui';

interface LibraryActiveFilterBarProps {
  itemCount: number;
  selectedTag: string | null;
  onResetFilters: () => void;
  onOpenGraph?: () => void;
}

export function LibraryActiveFilterBar({
  itemCount,
  selectedTag,
  onResetFilters,
  onOpenGraph,
}: LibraryActiveFilterBarProps) {
  const appMuted = useSemanticColor('appMuted');
  const appText = useSemanticColor('appText');

  return (
    <View className="px-6 pb-2.5 flex-row items-center justify-between">
      <Text className="text-xs text-app-muted font-medium">
        {itemCount}개 항목 표시 중
        {selectedTag ? ` · #${selectedTag}` : ''}
      </Text>
      <View className="flex-row items-center gap-1.5">
        {onOpenGraph ? (
          <Pressable
            onPress={onOpenGraph}
            className="flex-row items-center rounded-lg border border-app-border bg-app-surface px-2.5 py-1 active:bg-app-bg"
            accessibilityRole="button"
            accessibilityLabel="첫 검색 결과를 그래프에서 보기"
          >
            <Network size={11} color={appText} style={{ marginRight: 4 }} />
            <Text className="text-[11px] font-semibold text-app-text">그래프로 보기</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onResetFilters}
          className="flex-row items-center rounded-lg bg-app-border/40 px-2.5 py-1 active:bg-app-border/70"
          accessibilityRole="button"
          accessibilityLabel="필터 초기화"
        >
          <X size={11} color={appMuted} style={{ marginRight: 4 }} />
          <Text className="text-[11px] font-semibold text-app-muted">필터 초기화</Text>
        </Pressable>
      </View>
    </View>
  );
}
