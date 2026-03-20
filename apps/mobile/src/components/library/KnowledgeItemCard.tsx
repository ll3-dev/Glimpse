import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Link, Highlighter, Image, Share2 } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { KnowledgeItem } from '@glimpse/shared';
import { formatKnowledgeLabel, getDisplayLabels } from '@/src/features/labeling';
import { Card } from '@glimpse/ui/primitives';

type KnowledgeItemCardProps = {
  item: KnowledgeItem;
  onPress?: () => void;
};

function getTypeLabel(type: KnowledgeItem['type']): string {
  switch (type) {
    case 'note':
      return '메모';
    case 'link':
      return '링크';
    case 'highlight':
      return '하이라이트';
    case 'screenshot':
      return '스크린샷';
    case 'share':
      return '공유';
    default:
      return '항목';
  }
}

function getTypeIcon(type: KnowledgeItem['type']) {
  switch (type) {
    case 'note':
      return FileText;
    case 'link':
      return Link;
    case 'highlight':
      return Highlighter;
    case 'screenshot':
      return Image;
    case 'share':
      return Share2;
    default:
      return FileText;
  }
}

export function KnowledgeItemCard({ item, onPress }: KnowledgeItemCardProps) {
  const displayTitle = item.title || item.body || item.url || '제목 없음';
  const timeAgo = formatDistanceToNow(item.createdAt, { locale: ko, addSuffix: true });
  const TypeIcon = getTypeIcon(item.type);
  const typeLabel = getTypeLabel(item.type);
  const labels = getDisplayLabels(item);

  return (
    <Card className="mb-2 overflow-hidden">
      {onPress ? (
        <TouchableOpacity
          className="flex-row items-center p-4"
          activeOpacity={0.7}
          onPress={onPress}
        >
          <View className="mr-4">
            <TypeIcon size={18} color="#787774" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-app-text" numberOfLines={1}>
              {displayTitle}
            </Text>
            <Text className="mt-0.5 text-[10px] text-app-muted font-medium tracking-tight">
              {typeLabel} · {timeAgo}
            </Text>
            {labels.length > 0 ? (
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
        </TouchableOpacity>
      ) : (
        <View className="flex-row items-center p-4">
          <View className="mr-4">
            <TypeIcon size={18} color="#787774" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-app-text" numberOfLines={1}>
              {displayTitle}
            </Text>
            <Text className="mt-0.5 text-[10px] text-app-muted font-medium tracking-tight">
              {typeLabel} · {timeAgo}
            </Text>
            {labels.length > 0 ? (
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
        </View>
      )}
    </Card>
  );
}
