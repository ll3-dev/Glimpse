/**
 * ContextBadge Component
 *
 * Displays context information when chatting about a library item.
 */

import { View, Text, Pressable } from 'react-native';
import { X, FileText, Link as LinkIcon, Image } from 'lucide-react-native';
import { useSemanticColor } from '@glimpse/ui';
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
  const appMuted = useSemanticColor('appMuted');
  if (!item) return null;
  const Icon = typeIcons[item.type] || FileText;
  const displayTitle = item.title || item.body?.slice(0, 30) || '항목';

  return (
    <View className="flex-row items-center bg-app-surface border border-app-border mx-6 mb-2 px-3 py-2 rounded-md">
      <View className="w-6 h-6 rounded bg-app-border/40 items-center justify-center mr-2">
        <Icon size={14} color={appMuted} />
      </View>
      <Text className="flex-1 text-sm font-medium text-app-text" numberOfLines={1}>
        {displayTitle}
      </Text>
      {onRemove && (
        <Pressable onPress={onRemove} className="ml-2 p-1">
          <X size={16} color={appMuted} />
        </Pressable>
      )}
    </View>
  );
}
