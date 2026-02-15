/**
 * Review Item Card
 *
 * Displays a knowledge item in the review queue with action buttons.
 */

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Link, Check, Clock } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { KnowledgeItem } from '@/src/db';
import { Card } from '@/src/ui/primitives';

type ReviewItemCardProps = {
  item: KnowledgeItem;
  onComplete: () => void;
  onPostpone: () => void;
};

export function ReviewItemCard({ item, onComplete, onPostpone }: ReviewItemCardProps) {
  const displayTitle = item.title || item.body || item.url || '제목 없음';
  const timeAgo = formatDistanceToNow(item.createdAt, { locale: ko, addSuffix: true });
  const TypeIcon = item.type === 'note' ? FileText : Link;

  return (
    <Card className="mb-2 overflow-hidden">
      {/* Item Content */}
      <View className="flex-row items-center p-4">
        <View className="mr-4">
          <TypeIcon size={18} color="#787774" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-app-text" numberOfLines={2}>
            {displayTitle}
          </Text>
          <Text className="mt-0.5 text-[10px] text-app-muted font-medium uppercase tracking-tight">
            {timeAgo}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row border-t border-app-border">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center py-2.5 bg-white active:bg-green-50"
          onPress={onComplete}
          activeOpacity={0.7}
        >
          <Check size={14} color="#16a34a" />
          <Text className="ml-2 text-xs font-bold text-green-700">완료</Text>
        </TouchableOpacity>

        <View className="w-px bg-app-border" />

        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center py-2.5 bg-white active:bg-gray-50"
          onPress={onPostpone}
          activeOpacity={0.7}
        >
          <Clock size={14} color="#6b7280" />
          <Text className="ml-2 text-xs font-bold text-app-muted">나중에</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}
