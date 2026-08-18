import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Link, Highlighter, Image, Share2 } from 'lucide-react-native';
import { Text, Pressable, View } from 'react-native';
import type { KnowledgeItem } from '@glimpse/shared';
import { formatKnowledgeLabel, getDisplayLabels } from '@/src/features/labeling';
import { Card } from '@glimpse/ui/primitives';

type KnowledgeItemCardProps = {
  item: KnowledgeItem;
  onPress?: () => void;
};

const TYPE_CONFIG = {
  note: { label: '메모', Icon: FileText },
  link: { label: '링크', Icon: Link },
  highlight: { label: '하이라이트', Icon: Highlighter },
  screenshot: { label: '스크린샷', Icon: Image },
  share: { label: '공유', Icon: Share2 },
} as const;

function getTypeConfig(type: KnowledgeItem['type']) {
  return TYPE_CONFIG[type] ?? { label: '항목', Icon: FileText };
}

function ItemContent({
  item,
  showLabels,
}: {
  item: KnowledgeItem;
  showLabels: boolean;
}) {
  const displayTitle = item.title || item.body || item.url || '제목 없음';
  const timeAgo = formatDistanceToNow(item.createdAt, { locale: ko, addSuffix: true });
  const typeConfig = getTypeConfig(item.type);
  const labels = getDisplayLabels(item);

  return (
    <>
      <View className="mr-4">
        <typeConfig.Icon size={18} color="#787774" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-app-text" numberOfLines={1}>
          {displayTitle}
        </Text>
        <Text className="mt-0.5 text-[10px] text-app-muted font-medium tracking-tight">
          {typeConfig.label} · {timeAgo}
        </Text>
        {showLabels && labels.length > 0 ? (
          <View className="mt-2 flex-row flex-wrap">
            {labels.map((label) => (
              <View
                key={label}
                className="mr-2 mb-1 rounded bg-app-border/40 px-2 py-1"
              >
                <Text className="text-[10px] font-medium text-app-muted">
                  {formatKnowledgeLabel(label)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </>
  );
}

export function KnowledgeItemCard({ item, onPress }: KnowledgeItemCardProps) {
  const labels = getDisplayLabels(item);
  const showLabels = labels.length > 0;

  return (
    <Card className="mb-2 overflow-hidden">
      <Pressable
        className="flex-row items-center p-4 active:opacity-80"
        onPress={onPress}
        disabled={!onPress}
      >
        <ItemContent item={item} showLabels={showLabels} />
      </Pressable>
    </Card>
  );
}
