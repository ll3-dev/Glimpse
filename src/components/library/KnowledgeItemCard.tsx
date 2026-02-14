import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Link } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { KnowledgeItem } from '@/src/db';

type KnowledgeItemCardProps = {
  item: KnowledgeItem;
};

export function KnowledgeItemCard({ item }: KnowledgeItemCardProps) {
  const displayTitle = item.title || item.body || item.url || '제목 없음';
  const timeAgo = formatDistanceToNow(item.createdAt, { locale: ko, addSuffix: true });
  const TypeIcon = item.type === 'note' ? FileText : Link;

  return (
    <TouchableOpacity
      className="mb-3 flex-row items-center rounded-2xl bg-white p-5 border border-app-border"
      activeOpacity={0.7}
    >
      <View className="mr-5">
        <TypeIcon size={22} color="#37352f" />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-bold text-app-text" numberOfLines={1}>
          {displayTitle}
        </Text>
        <Text className="mt-1 text-xs text-app-subtle font-semibold uppercase tracking-wider">
          {timeAgo}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
