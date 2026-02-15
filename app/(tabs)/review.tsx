/**
 * Review Screen
 *
 * Displays knowledge items that are due for review.
 * Users can mark items as complete or postpone them.
 */

import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDueItems, markAsReviewed, postponeReview, type KnowledgeItem } from '@/src/features/review';
import { ReviewItemCard } from '@/src/components/review';
import { logger } from '@/src/utils/logger';
import { ScreenHeader } from '@/src/ui/primitives';

export default function ReviewScreen() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const loadDueItems = useCallback(async () => {
    try {
      const result = await getDueItems();
      if (result.success) {
        setItems(result.items);
      } else {
        logger.error('ReviewScreen.loadDueItems failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('ReviewScreen.loadDueItems error', { message: errorMessage });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDueItems();
  }, [loadDueItems]);

  useEffect(() => {
    loadDueItems();
  }, [loadDueItems]);

  const handleComplete = useCallback(async (itemId: string) => {
    const result = await markAsReviewed(itemId);
    if (result.success) {
      // Remove completed item from list
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } else {
      logger.error('Failed to mark item as reviewed', { itemId });
    }
  }, []);

  const handlePostpone = useCallback(async (itemId: string) => {
    const result = await postponeReview(itemId);
    if (result.success) {
      // Remove postponed item from list
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } else {
      logger.error('Failed to postpone review', { itemId });
    }
  }, []);

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="다시 보기"
        subtitle={`복습이 필요한 항목 ${items.length}개`}
      />

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 24, // px-6
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
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
