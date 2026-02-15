import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Link } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { KnowledgeItem } from '@/src/db';
import { Card } from '@/src/ui/primitives';

type KnowledgeItemCardProps = {
  item: KnowledgeItem;
};

export function KnowledgeItemCard({ item }: KnowledgeItemCardProps) {
  const displayTitle = item.title || item.body || item.url || '제목 없음';
  const timeAgo = formatDistanceToNow(item.createdAt, { locale: ko, addSuffix: true });
  const TypeIcon = item.type === 'note' ? FileText : Link;

  return (
    <Card className="mb-2 overflow-hidden">
      <TouchableOpacity
        className="flex-row items-center p-4"
        activeOpacity={0.7}
      >
        <View className="mr-4">
          <TypeIcon size={18} color="#787774" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-app-text" numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text className="mt-0.5 text-[10px] text-app-muted font-medium uppercase tracking-tight">
            {timeAgo}
          </Text>
        </View>
      </TouchableOpacity>
    </Card>
  );
}
