import { View, Text, Pressable } from 'react-native';
import {
  FileText,
  Link as LinkIcon,
  Highlighter,
  Image as ImageIcon,
  Share2,
  Check,
  X,
} from 'lucide-react-native';
import type { KnowledgeItem, Recommendation, RecommendationStatus } from '@glimpse/shared';
import { Card } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { cn } from '@/src/lib/utils';

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

const TYPE_CONFIG = {
  note: { label: '메모', Icon: FileText },
  link: { label: '링크', Icon: LinkIcon },
  highlight: { label: '하이라이트', Icon: Highlighter },
  screenshot: { label: '스크린샷', Icon: ImageIcon },
  share: { label: '공유', Icon: Share2 },
} as const;

function getTypeConfig(type: KnowledgeItem['type']) {
  return TYPE_CONFIG[type] ?? { label: '항목', Icon: FileText };
}

function truncate(text: string | null, maxLength: number): string {
  if (!text) return '제목 없음';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

const STATUS_CONFIG: Record<
  Exclude<RecommendationStatus, 'pending'>,
  { label: string; backgroundClassName: string; textClassName: string }
> = {
  accepted: { label: '연결 완료', backgroundClassName: 'bg-tag-mint-bg', textClassName: 'text-tag-mint-text' },
  ignored: { label: '거절함', backgroundClassName: 'bg-tag-rose-bg', textClassName: 'text-tag-rose-text' },
  dismissed: { label: '숨김', backgroundClassName: 'bg-app-border/40', textClassName: 'text-app-muted' },
};

function StatusBadge({ status }: { status: RecommendationStatus }) {
  if (status === 'pending') return null;

  const config = STATUS_CONFIG[status];

  return (
    <View className={cn('rounded px-2 py-0.5', config.backgroundClassName)}>
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
  const tagRoseText = useSemanticColor('tagRoseText');

  const typeConfigA = getTypeConfig(itemA.type);
  const IconA = typeConfigA.Icon;

  const typeConfigB = getTypeConfig(itemB.type);
  const IconB = typeConfigB.Icon;

  return (
    <Card className="mb-4 p-4">
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
        className="mb-2 flex-row items-center rounded-md p-2 -mx-2 bg-app-surface border border-transparent active:bg-app-bg active:border-app-border"
      >
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-app-border/40">
          <IconA size={16} color={appMuted} />
        </View>
        <View className="flex-1">
          <Text className="text-[10px] font-semibold text-app-muted uppercase tracking-tight">
            {typeConfigA.label} 1
          </Text>
          <Text className="text-sm font-semibold text-app-text" numberOfLines={2}>
            {truncate(itemA.title || itemA.body || itemA.url, 50)}
          </Text>
        </View>
      </Pressable>

      {/* Connector */}
      <View className="flex-row items-center gap-2 py-0.5 px-1 my-1">
        <View className="h-px flex-1 bg-app-border/80" />
        <Text className="text-[10px] font-bold text-app-subtle tracking-wider uppercase">연결 추천</Text>
        <View className="h-px flex-1 bg-app-border/80" />
      </View>

      {/* Item B */}
      <Pressable
        onPress={onPressItemB}
        disabled={!onPressItemB}
        className="mb-3 flex-row items-center rounded-md p-2 -mx-2 bg-app-surface border border-transparent active:bg-app-bg active:border-app-border"
      >
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-app-border/40">
          <IconB size={16} color={appMuted} />
        </View>
        <View className="flex-1">
          <Text className="text-[10px] font-semibold text-app-muted uppercase tracking-tight">
            {typeConfigB.label} 2
          </Text>
          <Text className="text-sm font-semibold text-app-text" numberOfLines={2}>
            {truncate(itemB.title || itemB.body || itemB.url, 50)}
          </Text>
        </View>
      </Pressable>

      {/* Reason */}
      <View className="mb-4 rounded-md border border-tag-lavender-text/20 bg-tag-lavender-bg/30 px-3 py-2.5">
        <Text className="text-xs leading-5 text-app-text font-medium">
          {recommendation.reason}
        </Text>
      </View>

      {/* Actions */}
      {!isResponded && (
        <View className="flex-row gap-2">
          <Pressable
            onPress={onAccept}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md bg-app-text py-2.5 active:opacity-80"
          >
            <Check size={14} color="white" />
            <Text className="text-xs font-semibold text-white">수락</Text>
          </Pressable>

          <Pressable
            onPress={onIgnore}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md bg-tag-rose-bg border border-tag-rose-text/20 py-2.5 active:opacity-80"
          >
            <X size={14} color={tagRoseText} />
            <Text className="text-xs font-semibold text-tag-rose-text">거절</Text>
          </Pressable>

          <Pressable
            onPress={onDismiss}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md bg-app-bg border border-app-border py-2.5 active:opacity-80"
          >
            <Text className="text-xs font-semibold text-app-muted">나중에</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}
