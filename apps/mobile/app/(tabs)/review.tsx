/**
 * Review Screen
 *
 * Displays knowledge items that are due for review.
 * Users can mark items as complete or postpone them.
 */

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDueItemsQuery, useReviewActionsMutation } from '@/src/hooks';
import { QueryStateScrollView } from '@glimpse/ui/common';
import { ReviewItemCard } from '@/src/components/review';
import { ScreenHeader } from '@glimpse/ui/primitives';
import { toast } from '@/src/stores/toast.store';
import { logger } from '@/src/utils/logger';

export default function ReviewScreen() {
  const router = useRouter();
  const { data, isLoading, isFetching, error, refetch } = useDueItemsQuery();
  const { markAsReviewed, postponeReview } = useReviewActionsMutation();
  const insets = useSafeAreaInsets();

  const items = data?.items ?? [];
  const isRefreshing = isFetching && !isLoading;

  const handleComplete = (itemId: string) => {
    markAsReviewed(
      { itemId },
      {
        onSuccess: () => {
          toast.success('복습이 완료되었습니다');
        },
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
        onSuccess: () => {
          toast.info('복습 일정을 연기했습니다');
        },
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
            onPress={() => router.push(`/library/${item.id}`)}
            onComplete={() => handleComplete(item.id)}
            onPostpone={() => handlePostpone(item.id)}
          />
        )}
      />
    </View>
  );
}
