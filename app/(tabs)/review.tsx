/**
 * Review Screen
 *
 * Displays knowledge items that are due for review.
 * Users can mark items as complete or postpone them.
 */

import { View, ScrollView, RefreshControl, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDueItemsQuery, useReviewActionsMutation } from '@/src/hooks';
import { ReviewItemCard } from '@/src/components/review';
import { ScreenHeader } from '@/src/ui/primitives';

export default function ReviewScreen() {
  const { data, isLoading, isFetching, refetch } = useDueItemsQuery();
  const { markAsReviewed, postponeReview } = useReviewActionsMutation();
  const insets = useSafeAreaInsets();

  const items = data?.items ?? [];
  const isRefreshing = isFetching && !isLoading;

  const handleComplete = (itemId: string) => {
    markAsReviewed(
      { itemId },
      {
        onError: (error) => {
          console.error('Failed to mark item as reviewed', error);
        },
      }
    );
  };

  const handlePostpone = (itemId: string) => {
    postponeReview(
      { itemId },
      {
        onError: (error) => {
          console.error('Failed to postpone review', error);
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

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 24,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => refetch()} />
        }
      >
        {isLoading ? (
          <View className="items-center justify-center py-20">
            <Text className="text-muted-foreground">로딩 중...</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="items-center justify-center px-8 py-20">
            <Text className="mb-2 text-lg font-medium text-app-text">
              복습할 항목이 없습니다
            </Text>
            <Text className="text-center text-sm text-muted-foreground">
              새로운 항목을 저장하면{'\n'}자동으로 복습 일정이 잡혀요
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <ReviewItemCard
              key={item.id}
              item={item}
              onComplete={() => handleComplete(item.id)}
              onPostpone={() => handlePostpone(item.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
