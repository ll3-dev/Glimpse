import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Linking, Text, Pressable, View } from 'react-native';
import { ExternalLink, Sparkles } from 'lucide-react-native';
import type { KnowledgeItem } from '@glimpse/shared';
import { useSemanticColor } from '@glimpse/ui';
import { formatKnowledgeLabel } from '@/src/features/labeling';
import { getTypeConfig } from './knowledge-type-config';

interface KnowledgeItemDetailCardProps {
  item: KnowledgeItem;
  displayLabels: string[];
}

export function KnowledgeItemDetailCard({ item, displayLabels }: KnowledgeItemDetailCardProps) {
  const appMuted = useSemanticColor('appMuted');
  const appPrimary = useSemanticColor('appPrimary');

  const typeConfig = getTypeConfig(item.type);
  const TypeIcon = typeConfig.Icon;

  return (
    <View className="mb-6">
      {/* Header Meta Info */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-1.5 rounded-md border border-app-border bg-app-surface px-2.5 py-1">
          <TypeIcon size={12} color={appMuted} />
          <Text className="text-xs font-semibold text-app-muted tracking-tight">
            {typeConfig.label}
          </Text>
        </View>
        <Text className="text-app-subtle text-xs font-medium">
          {format(item.createdAt, 'yyyy.MM.dd HH:mm', { locale: ko })}
        </Text>
      </View>

      {/* Editorial Title */}
      <Text className="text-app-text text-2xl font-bold leading-tight mb-4 tracking-tight">
        {item.title || item.body || item.url || '제목 없음'}
      </Text>

      {/* AI Summary Callout */}
      {item.summary && (
        <View className="border border-app-border bg-app-surface rounded-xl p-4 mb-5 shadow-xs">
          <View className="flex-row items-center gap-1.5 mb-2">
            <Sparkles size={14} color={appMuted} />
            <Text className="text-xs font-semibold text-app-text tracking-tight">
              AI 요약
            </Text>
          </View>
          <Text className="text-app-text text-sm leading-6">
            {item.summary}
          </Text>
        </View>
      )}

      {/* Body Content */}
      {item.body && (
        <View className="mb-5">
          <Text className="text-app-text text-base leading-7 select-text">
            {item.body}
          </Text>
        </View>
      )}

      {/* URL Link Bookmark Card */}
      {item.url && (
        <Pressable
          className="flex-row items-center justify-between bg-app-surface border border-app-border rounded-xl p-3.5 mb-5 active:opacity-80 shadow-xs"
          onPress={() => item.url && Linking.openURL(item.url)}
        >
          <Text
            className="flex-1 text-sm text-app-primary font-medium mr-2"
            numberOfLines={2}
          >
            {item.url}
          </Text>
          <ExternalLink size={14} color={appPrimary} />
        </Pressable>
      )}

      {/* Tags & Labels Section */}
      {(displayLabels.length > 0 || (item.tags && item.tags.length > 0)) && (
        <View className="pt-4 border-t border-app-border flex-row flex-wrap gap-1.5 items-center">
          {displayLabels.map((label) => (
            <View
              key={label}
              className="bg-app-surface border border-app-border rounded-md px-2.5 py-1"
            >
              <Text className="text-app-text text-xs font-medium">
                {formatKnowledgeLabel(label)}
              </Text>
            </View>
          ))}
          {item.tags?.map((tag) => (
            <View
              key={tag}
              className="bg-app-surface border border-app-border rounded-md px-2.5 py-1"
            >
              <Text className="text-app-muted text-xs font-medium">
                #{tag}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
