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
    <View className="mb-3 rounded-2xl bg-white border border-app-border overflow-hidden">
      {/* Item Content */}
      <View className="flex-row items-center p-5">
        <View className="mr-4">
          <TypeIcon size={22} color="#37352f" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-app-text" numberOfLines={2}>
            {displayTitle}
          </Text>
          <Text className="mt-1 text-xs text-app-subtle font-semibold uppercase tracking-wider">
            {timeAgo}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row border-t border-app-border">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center py-3 bg-green-50 active:bg-green-100"
          onPress={onComplete}
          activeOpacity={0.7}
        >
          <Check size={16} color="#16a34a" />
          <Text className="ml-2 text-sm font-semibold text-green-600">완료</Text>
        </TouchableOpacity>

        <View className="w-px bg-app-border" />

        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center py-3 active:bg-gray-50"
          onPress={onPostpone}
          activeOpacity={0.7}
        >
          <Clock size={16} color="#6b7280" />
          <Text className="ml-2 text-sm font-semibold text-gray-500">나중에</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
