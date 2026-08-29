import { View, Text, Pressable } from 'react-native';
import { Check, X } from 'lucide-react-native';
import type { KnowledgeItem, Recommendation, RecommendationStatus } from '@glimpse/shared';
import { Card } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { cn } from '@/src/lib/utils';
import { getTypeConfig } from '@/src/components/library/knowledge-type-config';

type RecommendationCardProps = {
  itemA: KnowledgeItem;
  itemB: KnowledgeItem;
  recommendation: Recommendation;
  onPressItemA?: () => void;
  onPressItemB?: () => void;
  onAccept: () => void;
  onIgnore: () => void;
  onDismiss: () => void;
};

function truncate(text: string | null, maxLength: number): string {
  if (!text) return '제목 없음';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

const STATUS_CONFIG: Record<
  Exclude<RecommendationStatus, 'pending'>,
  { label: string; backgroundClassName: string; textClassName: string }
> = {
  accepted: { label: '연결 완료', backgroundClassName: 'bg-app-bg border border-app-border', textClassName: 'text-app-text' },
  ignored: { label: '거절함', backgroundClassName: 'bg-app-bg border border-app-border', textClassName: 'text-app-subtle' },
  dismissed: { label: '숨김', backgroundClassName: 'bg-app-bg border border-app-border', textClassName: 'text-app-muted' },
};

function StatusBadge({ status }: { status: RecommendationStatus }) {
  if (status === 'pending') return null;

  const config = STATUS_CONFIG[status];

  return (
    <View className={cn('rounded-md px-2 py-0.5', config.backgroundClassName)}>
      <Text className={cn('text-[10px] font-medium tracking-tight', config.textClassName)}>
        {config.label}
      </Text>
    </View>
  );
}

export function RecommendationCard({
  itemA,
  itemB,
  recommendation,
  onPressItemA,
  onPressItemB,
  onAccept,
  onIgnore,
  onDismiss,
}: RecommendationCardProps) {
  const isResponded = recommendation.status !== 'pending';
  const appMuted = useSemanticColor('appMuted');

  const typeConfigA = getTypeConfig(itemA.type);
  const IconA = typeConfigA.Icon;

  const typeConfigB = getTypeConfig(itemB.type);
  const IconB = typeConfigB.Icon;

  return (
    <Card className="mb-4 p-4 border border-app-border bg-app-surface shadow-xs">
      {/* Status Badge */}
      {isResponded && (
        <View className="mb-3 flex-row">
          <StatusBadge status={recommendation.status} />
        </View>
      )}

      {/* Item A */}
      <Pressable
        onPress={onPressItemA}
        disabled={!onPressItemA}
        className="mb-2 flex-row items-center rounded-lg p-2.5 -mx-1 bg-app-bg border border-app-border active:opacity-80"
      >
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-app-surface border border-app-border">
          <IconA size={15} color={appMuted} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[10px] font-semibold text-app-muted uppercase tracking-tight">
            {typeConfigA.label}
          </Text>
          <Text className="text-sm font-semibold text-app-text" numberOfLines={1}>
            {truncate(itemA.title || itemA.body || itemA.url, 50)}
          </Text>
        </View>
      </Pressable>

      {/* Connector */}
      <View className="flex-row items-center gap-2 py-1 px-1 my-0.5">
        <View className="h-px flex-1 bg-app-border" />
        <Text className="text-[10px] font-bold text-app-subtle tracking-wider uppercase">연결 추천</Text>
        <View className="h-px flex-1 bg-app-border" />
      </View>

      {/* Item B */}
      <Pressable
        onPress={onPressItemB}
        disabled={!onPressItemB}
        className="mb-3 flex-row items-center rounded-lg p-2.5 -mx-1 bg-app-bg border border-app-border active:opacity-80"
      >
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-app-surface border border-app-border">
          <IconB size={15} color={appMuted} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[10px] font-semibold text-app-muted uppercase tracking-tight">
            {typeConfigB.label}
          </Text>
          <Text className="text-sm font-semibold text-app-text" numberOfLines={1}>
            {truncate(itemB.title || itemB.body || itemB.url, 50)}
          </Text>
        </View>
      </Pressable>

      {/* Reason */}
      <View className="mb-4 rounded-lg border border-app-border bg-app-bg px-3.5 py-2.5">
        <Text className="text-xs leading-5 text-app-text font-medium">
          {recommendation.reason}
        </Text>
      </View>

      {/* Actions */}
      {!isResponded && (
        <View className="flex-row gap-2">
          <Pressable
            onPress={onAccept}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-app-text py-2.5 active:opacity-80"
          >
            <Check size={14} color="white" />
            <Text className="text-xs font-semibold text-white">수락</Text>
          </Pressable>

          <Pressable
            onPress={onIgnore}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-app-surface border border-app-border py-2.5 active:bg-app-bg"
          >
            <X size={14} color={appMuted} />
            <Text className="text-xs font-semibold text-app-muted">거절</Text>
          </Pressable>

          <Pressable
            onPress={onDismiss}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-app-surface border border-app-border py-2.5 active:bg-app-bg"
          >
            <Text className="text-xs font-semibold text-app-subtle">나중에</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}
