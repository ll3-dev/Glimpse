/**
 * ContextBadge Component
 *
 * Displays context information when chatting about a library item.
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { X, FileText, Link as LinkIcon, Image } from 'lucide-react-native';
import type { KnowledgeItem } from '@glimpse/shared';

interface ContextBadgeProps {
  item: KnowledgeItem;
  onRemove?: () => void;
}

const typeIcons = {
  note: FileText,
  link: LinkIcon,
  highlight: FileText,
  screenshot: Image,
  share: FileText,
} as const;

export function ContextBadge({ item, onRemove }: ContextBadgeProps) {
  if (!item) return null;
  const Icon = typeIcons[item.type] || FileText;
  const displayTitle = item.title || item.body?.slice(0, 30) || '항목';

  return (
    <View className="flex-row items-center bg-gray-100 mx-4 mb-2 px-3 py-2 rounded-lg">
      <View className="w-6 h-6 rounded bg-gray-200 items-center justify-center mr-2">
        <Icon size={14} color="#6b7280" />
      </View>
      <Text className="flex-1 text-sm text-gray-700" numberOfLines={1}>
        {displayTitle}
      </Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} className="ml-2 p-1">
          <X size={16} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </View>
  );
}
