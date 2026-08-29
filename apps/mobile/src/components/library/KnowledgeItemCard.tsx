import { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Text, Pressable, View } from 'react-native';
import type { KnowledgeItem } from '@glimpse/shared';
import { formatKnowledgeLabel, getDisplayLabels } from '@/src/features/labeling';
import { Card } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { getTypeConfig } from './knowledge-type-config';

type KnowledgeItemCardProps = {
  item: KnowledgeItem;
  onPress?: (itemId: string) => void;
  onSelectTag?: (tag: string) => void;
};

function ItemContent({
  item,
  showBadges,
  onSelectTag,
}: {
  item: KnowledgeItem;
  showBadges: boolean;
  onSelectTag?: (tag: string) => void;
}) {
  const appMuted = useSemanticColor('appMuted');
  const displayTitle = item.title || item.body || item.url || '제목 없음';
  const timeAgo = formatDistanceToNow(item.createdAt, { locale: ko, addSuffix: true });
  const typeConfig = getTypeConfig(item.type);
  const labels = getDisplayLabels(item);
  const tags = item.tags ?? [];

  return (
    <>
      <View className="mr-4">
        <typeConfig.Icon size={18} color={appMuted} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-app-text" numberOfLines={1}>
          {displayTitle}
        </Text>
        <Text className="mt-1 text-xs text-app-muted font-medium">
          {typeConfig.label} · {timeAgo}
        </Text>
        {showBadges ? (
          <View className="mt-2.5 flex-row flex-wrap gap-1.5">
            {labels.map((label) => (
              <Pressable
                key={label}
                onPress={() => onSelectTag?.(label)}
                className="rounded bg-tag-mint-bg/60 px-2 py-0.5"
              >
                <Text className="text-[11px] font-medium text-tag-mint-text">
                  {formatKnowledgeLabel(label)}
                </Text>
              </Pressable>
            ))}
            {tags.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => onSelectTag?.(tag)}
                className="rounded bg-app-border/40 px-2 py-0.5"
              >
                <Text className="text-[11px] font-medium text-app-muted">
                  #{tag}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </>
  );
}

// memo: 라이브러리 화면은 검색 입력·필터 토글마다 목록 배열을 새로 만들어
// FlashList의 renderItem을 재실행한다. 카드는 순수 prop 렌더이고 item 참조는
// 쿼리 캐시가 유지하므로, 내용이 바뀌지 않은 카드는 재렌더를 건너뛴다.
export const KnowledgeItemCard = memo(function KnowledgeItemCard({
  item,
  onPress,
  onSelectTag,
}: KnowledgeItemCardProps) {
  const labels = getDisplayLabels(item);
  const tags = item.tags ?? [];
  const showBadges = labels.length > 0 || tags.length > 0;

  return (
    <Card className="mb-2 overflow-hidden">
      <Pressable
        className="flex-row items-center p-4 active:opacity-80"
        onPress={() => onPress?.(item.id)}
        disabled={!onPress}
      >
        <ItemContent item={item} showBadges={showBadges} onSelectTag={onSelectTag} />
      </Pressable>
    </Card>
  );
});
