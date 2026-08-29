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
  const destructiveColor = useSemanticColor('appAccent');
  const appMuted = useSemanticColor('appMuted');
  const appSubtle = useSemanticColor('appSubtle');
  const appPrimary = useSemanticColor('appPrimary');
  const tagLavenderText = useSemanticColor('tagLavenderText');
  const tagMintText = useSemanticColor('tagMintText');

  const displayTitle = item.title || item.body || item.url || '제목 없음';
  const timeAgo = formatDistanceToNow(item.createdAt, { locale: ko, addSuffix: true });
  const typeConfig = getTypeConfig(item.type);
  const TypeIcon = typeConfig.Icon;

  return (
    <Card className="mb-3 overflow-hidden border border-app-border bg-app-surface shadow-xs">
      {/* Header Info */}
      <View className="flex-row items-center justify-between px-4 pt-3.5 pb-2">
        <View className="flex-row items-center gap-1.5 rounded-full bg-app-border/40 px-2.5 py-0.5">
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
        className="px-4 py-3 active:opacity-90"
        onPress={() => setIsFlipped((prev) => !prev)}
      >
        <Text className="text-base font-bold text-app-text leading-snug mb-2">
          {displayTitle}
        </Text>

        {!isFlipped ? (
          <View className="my-2 flex-row items-center justify-center rounded-md bg-app-bg py-3 px-4 border border-dashed border-app-border">
            <Eye size={15} color={appMuted} className="mr-2" />
            <Text className="text-xs font-semibold text-app-muted">
              탭하여 내용 확인하기 (Active Recall)
            </Text>
          </View>
        ) : (
          <View className="mt-1 mb-2 pt-2 border-t border-app-border/60">
            {item.body && (
              <Text className="text-sm text-app-text leading-6 mb-3">
                {item.body}
              </Text>
            )}

            {item.summary && (
              <View className="bg-tag-lavender-bg/30 border border-tag-lavender-text/20 rounded-md p-2.5 mb-2.5">
                <View className="flex-row items-center gap-1 mb-1">
                  <Sparkles size={12} color={tagLavenderText} />
                  <Text className="text-[11px] font-semibold text-tag-lavender-text">
                    요약
                  </Text>
                </View>
                <Text className="text-xs leading-4.5 text-app-text">
                  {item.summary}
                </Text>
              </View>
            )}

            {item.url && (
              <Text className="text-xs text-app-primary underline mb-2" numberOfLines={1}>
                {item.url}
              </Text>
            )}

            <View className="flex-row items-center justify-between mt-1">
              <View className="flex-row items-center">
                <EyeOff size={13} color={appSubtle} className="mr-1" />
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
          className="flex-1 flex-row items-center justify-center py-3 bg-app-surface active:bg-tag-mint-bg/40"
          onPress={() => onComplete(item.id)}
        >
          <Check size={15} color={tagMintText} />
          <Text className="ml-1.5 text-xs font-bold text-tag-mint-text">기억남</Text>
        </Pressable>

        <View className="w-px bg-app-border" />

        {onForgot && (
          <>
            <Pressable
              className="flex-1 flex-row items-center justify-center py-3 bg-app-surface active:bg-app-bg"
              onPress={() => onForgot(item.id)}
            >
              <X size={14} color={destructiveColor} />
              <Text className="ml-1.5 text-xs font-semibold text-app-muted">기억 안 남</Text>
            </Pressable>
            <View className="w-px bg-app-border" />
          </>
        )}

        <Pressable
          className="flex-1 flex-row items-center justify-center py-3 bg-app-surface active:bg-app-bg"
          onPress={() => onPostpone(item.id)}
        >
          <Clock size={14} color={appMuted} />
          <Text className="ml-1.5 text-xs font-semibold text-app-muted">나중에</Text>
        </Pressable>
      </View>
    </Card>
  );
}
