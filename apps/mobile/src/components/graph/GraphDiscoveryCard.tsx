import { Check, ChevronRight, Clock, Sparkles, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { GraphDiscovery } from '@glimpse/features';
import { useSemanticColor } from '@glimpse/ui';

type GraphDiscoveryCardProps = {
  discovery: GraphDiscovery;
  isResponding: boolean;
  onOpenItem: (itemId: string) => void;
  onFocus: (itemId: string) => void;
  onAccept: () => void;
  onIgnore: () => void;
  onDismiss: () => void;
};

function titleOf(item: GraphDiscovery['itemA']): string {
  return item.title?.trim() || item.summary?.trim() || item.body?.trim() || '제목 없는 지식';
}

export function GraphDiscoveryCard({
  discovery,
  isResponding,
  onOpenItem,
  onFocus,
  onAccept,
  onIgnore,
  onDismiss,
}: GraphDiscoveryCardProps) {
  const appText = useSemanticColor('appText');
  const appMuted = useSemanticColor('appMuted');
  const appBg = useSemanticColor('appBg');
  const isNew = discovery.kind === 'new';

  return (
    <View className="mx-4 mb-3 rounded-xl border border-app-border bg-app-surface p-4">
      <View className="mb-2.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Sparkles size={14} color={appText} />
          <Text className="text-sm font-semibold text-app-text">오늘의 발견</Text>
        </View>
        <Text className="rounded-md bg-tag-lavender-bg px-2 py-0.5 text-[10px] font-medium text-tag-lavender-text">
          {isNew ? '새 연결' : '최근 수락'}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        {[discovery.itemA, discovery.itemB].map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onOpenItem(item.id)}
            className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 active:opacity-75"
            accessibilityRole="button"
            accessibilityLabel={`${titleOf(item)} 상세 보기`}
          >
            <Text className="text-xs font-semibold text-app-text" numberOfLines={2}>
              {titleOf(item)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="mt-2.5 text-xs leading-relaxed text-app-muted" numberOfLines={2}>
        {discovery.recommendation.reason?.trim() || '두 지식의 공통 맥락을 확인해 보세요.'}
      </Text>

      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          onPress={() => onFocus(discovery.itemA.id)}
          className="h-9 flex-row items-center gap-1 rounded-lg border border-app-border bg-app-surface px-3 active:bg-app-bg"
          accessibilityRole="button"
          accessibilityLabel="연결을 그래프에서 보기"
        >
          <Text className="text-[11px] font-semibold text-app-text">그래프에서 보기</Text>
          <ChevronRight size={13} color={appMuted} />
        </Pressable>

        {isNew ? (
          <View className="ml-auto flex-row gap-1.5">
            <Pressable
              onPress={onAccept}
              disabled={isResponding}
              className="h-9 w-9 items-center justify-center rounded-lg bg-app-text active:opacity-80 disabled:opacity-40"
              accessibilityRole="button"
              accessibilityLabel="연결 수락"
            >
              <Check size={14} color={appBg} />
            </Pressable>
            <Pressable
              onPress={onIgnore}
              disabled={isResponding}
              className="h-9 w-9 items-center justify-center rounded-lg border border-app-border bg-app-surface active:bg-app-bg disabled:opacity-40"
              accessibilityRole="button"
              accessibilityLabel="연결 무시"
            >
              <X size={14} color={appMuted} />
            </Pressable>
            <Pressable
              onPress={onDismiss}
              disabled={isResponding}
              className="h-9 w-9 items-center justify-center rounded-lg border border-app-border bg-app-surface active:bg-app-bg disabled:opacity-40"
              accessibilityRole="button"
              accessibilityLabel="연결 나중에 보기"
            >
              <Clock size={14} color={appMuted} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
