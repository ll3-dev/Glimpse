/**
 * Review Screen
 *
 * Displays knowledge items that are due for review.
 * Users can mark items as complete or postpone them.
 */

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDueItemsQuery, useReviewActionsMutation } from '@/src/hooks';
import { QueryStateScrollView } from '@glimpse/ui/common';
import { ReviewItemCard } from '@/src/components/review';
import { ScreenHeader } from '@glimpse/ui/primitives';
import { logger } from '@/src/utils/logger';

export default function ReviewScreen() {
  const { data, isLoading, isFetching, error, refetch } = useDueItemsQuery();
  const { markAsReviewed, postponeReview } = useReviewActionsMutation();
  const insets = useSafeAreaInsets();

  const items = data?.items ?? [];
  const isRefreshing = isFetching && !isLoading;

  const handleComplete = (itemId: string) => {
    markAsReviewed(
      { itemId },
      {
        onError: (error) => {
          logger.error('Failed to mark item as reviewed', error, { itemId });
        },
      }
    );
  };

  const handlePostpone = (itemId: string) => {
    postponeReview(
      { itemId },
      {
        onError: (error) => {
          logger.error('Failed to postpone review', error, { itemId });
        },
      }
    );
  };

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="다시 보기"
        subtitle={`복습이 필요한 항목 ${items.length}개`}
      />

      <QueryStateScrollView
        data={items}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={() => refetch()}
        error={error}
        bottomInset={insets.bottom}
        topPadding={8}
        emptyTitle="복습할 항목이 없습니다"
        emptyDescription={"새로운 항목을 저장하면\n자동으로 복습 일정이 잡혀요"}
        keyExtractor={(item) => item.id}
        renderItem={(item) => (
          <ReviewItemCard
            key={item.id}
            item={item}
            onComplete={() => handleComplete(item.id)}
            onPostpone={() => handlePostpone(item.id)}
          />
        )}
      />
    </View>
  );
}
