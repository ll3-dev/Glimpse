import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  FileText,
  Link as LinkIcon,
  Highlighter,
  Image as ImageIcon,
  Share2,
  Check,
  Clock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import { Text, Pressable, View } from 'react-native';
import type { KnowledgeItem } from '@glimpse/shared';
import { Card } from '@glimpse/ui/primitives';

type ReviewItemCardProps = {
  item: KnowledgeItem;
  onPress?: (itemId: string) => void;
  onComplete: (itemId: string) => void;
  onPostpone: (itemId: string) => void;
};

const TYPE_CONFIG = {
  note: { label: '메모', Icon: FileText },
  link: { label: '링크', Icon: LinkIcon },
  highlight: { label: '하이라이트', Icon: Highlighter },
  screenshot: { label: '스크린샷', Icon: ImageIcon },
  share: { label: '공유', Icon: Share2 },
} as const;

function getTypeConfig(type: KnowledgeItem['type']) {
  return TYPE_CONFIG[type] ?? { label: '항목', Icon: FileText };
}

export function ReviewItemCard({
  item,
  onPress,
  onComplete,
  onPostpone,
}: ReviewItemCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const displayTitle = item.title || item.body || item.url || '제목 없음';
  const timeAgo = formatDistanceToNow(item.createdAt, { locale: ko, addSuffix: true });
  const typeConfig = getTypeConfig(item.type);
  const TypeIcon = typeConfig.Icon;

  return (
    <Card className="mb-3 overflow-hidden border border-app-border bg-app-surface shadow-xs">
      {/* Header Info */}
      <View className="flex-row items-center justify-between px-4 pt-3.5 pb-2">
        <View className="flex-row items-center gap-1.5 rounded-full bg-app-border/40 px-2.5 py-0.5">
          <TypeIcon size={12} color="#787774" />
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
            <Eye size={15} color="#787774" className="mr-2" />
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
                  <Sparkles size={12} color="#6e3ab7" />
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
                <EyeOff size={13} color="#9b9a97" className="mr-1" />
                <Text className="text-[11px] text-app-subtle">다시 탭하여 닫기</Text>
              </View>
              {onPress && (
                <Pressable
                  onPress={() => onPress(item.id)}
                  className="flex-row items-center py-0.5 px-2"
                >
                  <Text className="text-xs text-app-primary font-medium mr-1">상세 보기</Text>
                  <ArrowRight size={12} color="#2383e2" />
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
          <Check size={15} color="#1a7f37" />
          <Text className="ml-1.5 text-xs font-bold text-tag-mint-text">기억남 (완료)</Text>
        </Pressable>

        <View className="w-px bg-app-border" />

        <Pressable
          className="flex-1 flex-row items-center justify-center py-3 bg-app-surface active:bg-app-bg"
          onPress={() => onPostpone(item.id)}
        >
          <Clock size={14} color="#787774" />
          <Text className="ml-1.5 text-xs font-semibold text-app-muted">나중에 복습</Text>
        </Pressable>
      </View>
    </Card>
  );
}
