/**
 * Review Screen
 *
 * Displays knowledge items that are due for review.
 * Users can mark items as complete or postpone them.
 */

import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Effect } from 'effect';
import { getDueItems, markAsReviewed, postponeReview, type KnowledgeItem } from '@/src/features/review';
import { ReviewItemCard } from '@/src/components/review';
import { logger } from '@/src/utils/logger';
import { appError, tryPromise } from '@/src/lib/effect-result';
import { ScreenHeader } from '@/src/ui/primitives';

export default function ReviewScreen() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const loadDueItems = useCallback(async () => {
    const program = Effect.gen(function* () {
      const result = yield* tryPromise(
        () => getDueItems(),
        (error) => appError('UNKNOWN_ERROR', 'ReviewScreen.loadDueItems failed', error)
      );
      setItems(result.items);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          logger.error('ReviewScreen.loadDueItems error', error);
        })
      ),
      Effect.ensuring(
        Effect.sync(() => {
          setIsLoading(false);
          setIsRefreshing(false);
        })
      )
    );
    await Effect.runPromise(program);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Effect.runPromise(
      tryPromise(
        () => loadDueItems(),
        (error) => appError('UNKNOWN_ERROR', 'ReviewScreen.handleRefresh failed', error)
      ).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => {
            logger.error('ReviewScreen.handleRefresh failed', error);
            setIsRefreshing(false);
          })
        )
      )
    );
  }, [loadDueItems]);

  useEffect(() => {
    loadDueItems();
  }, [loadDueItems]);

  const handleComplete = useCallback(async (itemId: string) => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* tryPromise(
          () => markAsReviewed(itemId),
          (error) => appError('UNKNOWN_ERROR', 'ReviewScreen.handleComplete failed', error)
        );
        if (result.success === false) {
          logger.error('Failed to mark item as reviewed', {
            itemId,
            code: result.error.code,
            message: result.error.message,
          });
          return;
        }
        setItems((prev) => prev.filter((item) => item.id !== itemId));
      }).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => {
            logger.error('ReviewScreen.handleComplete failed', error);
          })
        )
      )
    );
  }, []);

  const handlePostpone = useCallback(async (itemId: string) => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const result = yield* tryPromise(
          () => postponeReview(itemId),
          (error) => appError('UNKNOWN_ERROR', 'ReviewScreen.handlePostpone failed', error)
        );
        if (result.success === false) {
          logger.error('Failed to postpone review', {
            itemId,
            code: result.error.code,
            message: result.error.message,
          });
          return;
        }
        setItems((prev) => prev.filter((item) => item.id !== itemId));
      }).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => {
            logger.error('ReviewScreen.handlePostpone failed', error);
          })
        )
      )
    );
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
