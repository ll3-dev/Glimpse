import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getPendingRecommendations,
  generateRecommendations,
  saveRecommendations,
  respondToRecommendation,
  type RecommendationWithItems,
} from '@/src/features/recommendation';
import { DigestHeader, RecommendationCard } from '@/src/components/digest';
import { logger } from '@/src/utils/logger';

export default function DigestScreen() {
  const [recommendations, setRecommendations] = useState<RecommendationWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const loadRecommendations = useCallback(async () => {
    try {
      const result = await getPendingRecommendations();
      if (result.success) {
        setRecommendations(result.data);
      } else {
        logger.error('DigestScreen.loadRecommendations failed', {
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('DigestScreen.loadRecommendations error', { message: errorMessage });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    // Try to generate new recommendations
    const genResult = await generateRecommendations();
    if (genResult.success && genResult.data.length > 0) {
      await saveRecommendations(genResult.data);
    }

    // Reload pending recommendations
    await loadRecommendations();
  }, [loadRecommendations]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleAccept = useCallback(async (recommendationId: string) => {
    const result = await respondToRecommendation(recommendationId, 'accept');
    if (result.success) {
      setRecommendations((prev) =>
        prev.map((r) =>
          r.recommendation.id === recommendationId
            ? { ...r, recommendation: { ...r.recommendation, status: result.status } }
            : r
        )
      );
    }
  }, []);

  const handleIgnore = useCallback(async (recommendationId: string) => {
    const result = await respondToRecommendation(recommendationId, 'ignore');
    if (result.success) {
      setRecommendations((prev) =>
        prev.map((r) =>
          r.recommendation.id === recommendationId
            ? { ...r, recommendation: { ...r.recommendation, status: result.status } }
            : r
        )
      );
    }
  }, []);

  const handleDismiss = useCallback(async (recommendationId: string) => {
    const result = await respondToRecommendation(recommendationId, 'dismiss');
    if (result.success) {
      setRecommendations((prev) =>
        prev.map((r) =>
          r.recommendation.id === recommendationId
            ? { ...r, recommendation: { ...r.recommendation, status: result.status } }
            : r
        )
      );
    }
  }, []);

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <DigestHeader />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
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
