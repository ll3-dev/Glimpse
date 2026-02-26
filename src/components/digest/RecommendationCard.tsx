import { View, Text, Pressable } from 'react-native';
import { Check, X, Minus } from '@/src/ui/icons';
import type { KnowledgeItem, Recommendation, RecommendationStatus } from '@/src/db';
import { Card } from '@/src/ui/primitives';
import { cn } from '@/src/lib/utils';

type RecommendationCardProps = {
  itemA: KnowledgeItem;
  itemB: KnowledgeItem;
  recommendation: Recommendation;
  onAccept: () => void;
  onIgnore: () => void;
  onDismiss: () => void;
};

function getTypeEmoji(type: string): string {
  switch (type) {
    case 'note':
      return '📝';
    case 'link':
      return '🔗';
    case 'highlight':
      return '🖍️';
    case 'screenshot':
      return '📸';
    case 'share':
      return '📤';
    default:
      return '📄';
  }
}

function truncate(text: string | null, maxLength: number): string {
  if (!text) return '제목 없음';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function StatusBadge({ status }: { status: RecommendationStatus }) {
  if (status === 'pending') return null;

  const statusConfig = {
    accepted: { label: '수락함', backgroundClassName: 'bg-green-100', textClassName: 'text-green-700' },
    ignored: { label: '무시함', backgroundClassName: 'bg-red-100', textClassName: 'text-red-700' },
    dismissed: { label: '닫음', backgroundClassName: 'bg-app-border/40', textClassName: 'text-app-muted' },
  };

  const config = statusConfig[status];

  return (
    <View className={cn('rounded px-2 py-0.5', config.backgroundClassName)}>
      <Text className={cn('text-[10px] font-bold uppercase', config.textClassName)}>
        {config.label}
      </Text>
    </View>
  );
}

export function RecommendationCard({
  itemA,
  itemB,
  recommendation,
  onAccept,
  onIgnore,
  onDismiss,
}: RecommendationCardProps) {
  const isResponded = recommendation.status !== 'pending';

  return (
    <Card className="mb-4 p-4">
      {/* Status Badge */}
      {isResponded && (
        <View className="mb-3 flex-row">
          <StatusBadge status={recommendation.status} />
        </View>
      )}

      {/* Item A */}
      <View className="mb-2 flex-row items-start gap-3">
        <Text className="text-base">{getTypeEmoji(itemA.type)}</Text>
        <View className="flex-1">
          <Text className="text-[10px] font-bold text-app-muted uppercase tracking-tight">항목 1</Text>
          <Text className="text-sm font-semibold text-app-text" numberOfLines={2}>
            {truncate(itemA.title || itemA.body, 50)}
          </Text>
        </View>
      </View>

      {/* Connector */}
      <View className="flex-row items-center gap-2 py-1.5 pl-2">
        <View className="h-px flex-1 bg-app-border" />
        <Text className="text-[10px] font-bold text-app-subtle uppercase">연결</Text>
        <View className="h-px flex-1 bg-app-border" />
      </View>

      {/* Item B */}
      <View className="mb-3 flex-row items-start gap-3">
        <Text className="text-base">{getTypeEmoji(itemB.type)}</Text>
        <View className="flex-1">
          <Text className="text-[10px] font-bold text-app-muted uppercase tracking-tight">항목 2</Text>
          <Text className="text-sm font-semibold text-app-text" numberOfLines={2}>
            {truncate(itemB.title || itemB.body, 50)}
          </Text>
        </View>
      </View>

      {/* Reason */}
      <View className="mb-4 rounded-md border border-app-border/50 bg-app-bg px-3 py-2">
        <Text className="text-xs leading-5 text-app-muted font-medium">
          💡 {recommendation.reason}
        </Text>
      </View>

      {/* Actions */}
      {!isResponded && (
        <View className="flex-row gap-2">
          <Pressable
            onPress={onAccept}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md bg-app-primary py-2 active:opacity-80"
          >
            <Check size={14} color="white" />
            <Text className="text-xs font-bold text-white">수락</Text>
          </Pressable>

          <Pressable
            onPress={onIgnore}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md bg-app-accent py-2 active:opacity-80"
          >
            <X size={14} color="white" />
            <Text className="text-xs font-bold text-white">무시</Text>
          </Pressable>

          <Pressable
            onPress={onDismiss}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md bg-app-border/40 py-2 active:opacity-80"
          >
            <Minus size={14} color="#787774" />
            <Text className="text-xs font-bold text-app-muted">닫기</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}
