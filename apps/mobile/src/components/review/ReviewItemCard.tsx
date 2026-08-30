import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Check,
  Clock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react-native';
import { Text, Pressable, View } from 'react-native';
import type { KnowledgeItem } from '@glimpse/shared';
import { Card } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { getTypeConfig } from '@/src/components/library/knowledge-type-config';

type ReviewItemCardProps = {
  item: KnowledgeItem;
  onPress?: (itemId: string) => void;
  onComplete: (itemId: string) => void;
  onForgot?: (itemId: string) => void;
  onPostpone: (itemId: string) => void;
};

export function ReviewItemCard({
  item,
  onPress,
  onComplete,
  onForgot,
  onPostpone,
}: ReviewItemCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const appText = useSemanticColor('appText');
  const appMuted = useSemanticColor('appMuted');
  const appSubtle = useSemanticColor('appSubtle');
  const appPrimary = useSemanticColor('appPrimary');

  const displayTitle = item.title || item.body || item.url || '제목 없음';
  const timeAgo = formatDistanceToNow(item.createdAt, { locale: ko, addSuffix: true });
  const typeConfig = getTypeConfig(item.type);
  const TypeIcon = typeConfig.Icon;

  return (
    <Card className="mb-2 overflow-hidden border border-app-border bg-app-surface shadow-xs">
      {/* Header Info */}
      <View className="flex-row items-center justify-between px-4 pt-3.5 pb-2">
        <View className="flex-row items-center gap-1.5 rounded-md border border-app-border bg-app-bg px-2.5 py-0.5">
          <TypeIcon size={12} color={appMuted} />
          <Text className="text-[11px] font-semibold text-app-muted tracking-tight">
            {typeConfig.label}
          </Text>
        </View>
        <Text className="text-[11px] text-app-subtle font-medium">
          {timeAgo} 등록
        </Text>
      </View>

      {/* Main Flashcard Body (Front / Back toggle) */}
      <Pressable
        className="px-4 py-3 active:opacity-85"
        onPress={() => setIsFlipped((prev) => !prev)}
      >
        <Text className="text-base font-bold text-app-text leading-snug mb-2">
          {displayTitle}
        </Text>

        {!isFlipped ? (
          <View className="my-1.5 flex-row items-center justify-center rounded-lg bg-app-bg py-2.5 px-3 border border-app-border">
            <Eye size={14} color={appMuted} style={{ marginRight: 6 }} />
            <Text className="text-xs font-medium text-app-muted">
              탭하여 내용 확인하기
            </Text>
          </View>
        ) : (
          <View className="mt-1 mb-2 pt-2 border-t border-app-border">
            {item.body && (
              <Text className="text-sm text-app-text leading-6 mb-3">
                {item.body}
              </Text>
            )}

            {item.summary && (
              <View className="border border-app-border bg-app-bg rounded-lg p-3 mb-2.5">
                <View className="flex-row items-center gap-1 mb-1">
                  <Sparkles size={12} color={appMuted} />
                  <Text className="text-[11px] font-semibold text-app-text">
                    요약
                  </Text>
                </View>
                <Text className="text-xs leading-5 text-app-text">
                  {item.summary}
                </Text>
              </View>
            )}

            {item.url && (
              <Text className="text-xs text-app-primary underline mb-2" numberOfLines={1}>
                {item.url}
              </Text>
            )}

            <View className="flex-row items-center justify-between mt-2 pt-1">
              <View className="flex-row items-center">
                <EyeOff size={13} color={appSubtle} style={{ marginRight: 4 }} />
                <Text className="text-[11px] text-app-subtle">다시 탭하여 닫기</Text>
              </View>
              {onPress && (
                <Pressable
                  onPress={() => onPress(item.id)}
                  className="flex-row items-center py-0.5 px-2"
                >
                  <Text className="text-xs text-app-primary font-medium mr-1">상세 보기</Text>
                  <ArrowRight size={12} color={appPrimary} />
                </Pressable>
              )}
            </View>
          </View>
        )}
      </Pressable>

      {/* Review Feedback Actions */}
      <View className="flex-row border-t border-app-border bg-app-surface">
        <Pressable
          className="flex-1 flex-row items-center justify-center py-3 bg-app-surface active:bg-app-bg"
          onPress={() => onComplete(item.id)}
        >
          <Check size={14} color={appText} />
          <Text className="ml-1.5 text-xs font-semibold text-app-text">기억남</Text>
        </Pressable>

        <View className="w-px bg-app-border" />

        {onForgot && (
          <>
            <Pressable
              className="flex-1 flex-row items-center justify-center py-3 bg-app-surface active:bg-app-bg"
              onPress={() => onForgot(item.id)}
            >
              <X size={14} color={appMuted} />
              <Text className="ml-1.5 text-xs font-medium text-app-muted">기억 안 남</Text>
            </Pressable>
            <View className="w-px bg-app-border" />
          </>
        )}

        <Pressable
          className="flex-1 flex-row items-center justify-center py-3 bg-app-surface active:bg-app-bg"
          onPress={() => onPostpone(item.id)}
        >
          <Clock size={14} color={appSubtle} />
          <Text className="ml-1.5 text-xs font-medium text-app-subtle">나중에</Text>
        </Pressable>
      </View>
    </Card>
  );
}
