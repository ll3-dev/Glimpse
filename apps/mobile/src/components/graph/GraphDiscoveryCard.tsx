import { ChevronRight, Sparkles } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { GraphDiscovery } from '@glimpse/features';
import { useSemanticColor } from '@glimpse/ui';

type GraphDiscoveryCardProps = {
  discovery: GraphDiscovery;
  onOpenItem: (itemId: string) => void;
  onFocus: (itemId: string) => void;
};

function titleOf(item: GraphDiscovery['itemA']): string {
  return item.title?.trim() || item.summary?.trim() || item.body?.trim() || '제목 없는 지식';
}

export function GraphDiscoveryCard({
  discovery,
  onOpenItem,
  onFocus,
}: GraphDiscoveryCardProps) {
  const appText = useSemanticColor('appText');
  const appMuted = useSemanticColor('appMuted');
  const isNew = discovery.kind === 'new';

  return (
    <View className="mx-4 mb-3 flex-row items-center gap-3 rounded-xl border border-app-border bg-app-surface px-3 py-2.5">
      <View className="shrink-0 flex-row items-center gap-1.5">
        <Sparkles size={14} color={appText} />
        <Text className="text-xs font-semibold text-app-text">오늘의 발견</Text>
      </View>

      <View className="min-w-0 flex-1">
        <View className="min-w-0 flex-row items-center gap-1">
          {[discovery.itemA, discovery.itemB].map((item, index) => (
            <View key={item.id} className="min-w-0 flex-row items-center gap-1">
              {index > 0 ? <Text className="text-xs text-app-muted">↔</Text> : null}
              <Pressable
                onPress={() => onOpenItem(item.id)}
                className="min-w-0 rounded px-1 py-0.5 active:bg-app-bg"
                accessibilityRole="button"
                accessibilityLabel={`${titleOf(item)} 상세 보기`}
              >
                <Text className="text-xs font-semibold text-app-text" numberOfLines={1}>
                  {titleOf(item)}
                </Text>
              </Pressable>
            </View>
          ))}
          <Text className="ml-0.5 rounded-md bg-tag-lavender-bg px-1.5 py-0.5 text-[10px] font-medium text-tag-lavender-text">
            {isNew ? '새 연결' : '최근 연결'}
          </Text>
        </View>
        <Text className="mt-0.5 text-xs text-app-muted" numberOfLines={1}>
          {discovery.recommendation.reason?.trim() || '두 지식의 공통 맥락을 확인해 보세요.'}
        </Text>
      </View>

      <Pressable
        onPress={() => onFocus(discovery.itemA.id)}
        className="h-8 shrink-0 flex-row items-center gap-0.5 rounded-lg px-2 active:bg-app-bg"
        accessibilityRole="button"
        accessibilityLabel="연결을 그래프에서 보기"
      >
        <Text className="text-[11px] font-semibold text-app-text">보기</Text>
        <ChevronRight size={13} color={appMuted} />
      </Pressable>
    </View>
  );
}
