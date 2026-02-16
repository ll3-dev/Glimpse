import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Effect } from 'effect';
import {
  getPendingRecommendations,
  generateRecommendations,
  saveRecommendations,
  respondToRecommendation,
  type RecommendationWithItems,
} from '@/src/features/recommendation';
import { RecommendationCard } from '@/src/components/digest';
import { logger } from '@/src/utils/logger';
import { appError, isFailure, tryPromise } from '@/src/lib/effect-result';
import { ScreenHeader } from '@/src/ui/primitives';

export default function DigestScreen() {
  const [recommendations, setRecommendations] = useState<RecommendationWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const loadRecommendations = useCallback(async () => {
    const program = Effect.gen(function* () {
      const result = yield* tryPromise(
        () => getPendingRecommendations(),
        (error) => appError('UNKNOWN_ERROR', 'DigestScreen.loadRecommendations error', error)
      );

      if (isFailure(result)) {
        logger.error('DigestScreen.loadRecommendations failed', {
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
        });
        return;
      }

      setRecommendations(result.data);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          logger.error('DigestScreen.loadRecommendations error', error);
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

    const program = Effect.gen(function* () {
      const genResult = yield* tryPromise(
        () => generateRecommendations(),
        (error) => appError('GENERATION_ERROR', 'DigestScreen.handleRefresh failed', error)
      );

      if (genResult.success && genResult.data.length > 0) {
        const saveResult = yield* tryPromise(
          () => saveRecommendations(genResult.data),
          (error) => appError('DATABASE_ERROR', 'DigestScreen.handleRefresh failed', error)
        );
        if (isFailure(saveResult)) {
          logger.error('DigestScreen.handleRefresh save failed', saveResult.error);
        }
      }

      yield* tryPromise(
        () => loadRecommendations(),
        (error) => appError('UNKNOWN_ERROR', 'DigestScreen.handleRefresh failed', error)
      );
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          logger.error('DigestScreen.handleRefresh failed', error);
          setIsRefreshing(false);
        })
      )
    );

    await Effect.runPromise(program);
  }, [loadRecommendations]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleAccept = useCallback(async (recommendationId: string) => {
    const program = Effect.gen(function* () {
      const result = yield* tryPromise(
        () => respondToRecommendation(recommendationId, 'accept'),
        (error) => appError('UNKNOWN_ERROR', 'DigestScreen.handleAccept failed', error)
      );
      if (result.success === false) {
        logger.error('DigestScreen.handleAccept failed', result.error);
        return;
      }

      setRecommendations((prev) =>
        prev.map((r) =>
          r.recommendation.id === recommendationId
            ? { ...r, recommendation: { ...r.recommendation, status: result.status } }
            : r
        )
      );
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          logger.error('DigestScreen.handleAccept failed', error);
        })
      )
    );
    await Effect.runPromise(program);
  }, []);

  const handleIgnore = useCallback(async (recommendationId: string) => {
    const program = Effect.gen(function* () {
      const result = yield* tryPromise(
        () => respondToRecommendation(recommendationId, 'ignore'),
        (error) => appError('UNKNOWN_ERROR', 'DigestScreen.handleIgnore failed', error)
      );
      if (result.success === false) {
        logger.error('DigestScreen.handleIgnore failed', result.error);
        return;
      }

      setRecommendations((prev) =>
        prev.map((r) =>
          r.recommendation.id === recommendationId
            ? { ...r, recommendation: { ...r.recommendation, status: result.status } }
            : r
        )
      );
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          logger.error('DigestScreen.handleIgnore failed', error);
        })
      )
    );
    await Effect.runPromise(program);
  }, []);

  const handleDismiss = useCallback(async (recommendationId: string) => {
    const program = Effect.gen(function* () {
      const result = yield* tryPromise(
        () => respondToRecommendation(recommendationId, 'dismiss'),
        (error) => appError('UNKNOWN_ERROR', 'DigestScreen.handleDismiss failed', error)
      );
      if (result.success === false) {
        logger.error('DigestScreen.handleDismiss failed', result.error);
        return;
      }

      setRecommendations((prev) =>
        prev.map((r) =>
          r.recommendation.id === recommendationId
            ? { ...r, recommendation: { ...r.recommendation, status: result.status } }
            : r
        )
      );
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          logger.error('DigestScreen.handleDismiss failed', error);
        })
      )
    );
    await Effect.runPromise(program);
  }, []);

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="연결 추천"
        subtitle="항목 간의 지식 연결"
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 24,
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
        ) : recommendations.length === 0 ? (
          <View className="items-center justify-center px-8 py-20">
            <Text className="mb-2 text-lg font-medium text-app-text">
              추천이 없습니다
            </Text>
            <Text className="text-center text-sm text-muted-foreground">
              더 많은 항목을 저장하면{'\n'}연결 추천을 받을 수 있어요
            </Text>
          </View>
        ) : (
          recommendations.map((rec) => (
            <RecommendationCard
              key={rec.recommendation.id}
              itemA={rec.itemA}
              itemB={rec.itemB}
              recommendation={rec.recommendation}
              onAccept={() => handleAccept(rec.recommendation.id)}
              onIgnore={() => handleIgnore(rec.recommendation.id)}
              onDismiss={() => handleDismiss(rec.recommendation.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
