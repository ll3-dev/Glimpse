/**
 * Digest Screen
 *
 * Displays knowledge connection recommendations.
 * Users can accept, ignore, or dismiss recommendations.
 */

import { View, ScrollView, RefreshControl, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecommendationsQuery, useRecommendationActionsMutation } from '@/src/hooks';
import { RecommendationCard } from '@/src/components/digest';
import { ScreenHeader } from '@/src/ui/primitives';

export default function DigestScreen() {
  const { data: recommendations, isLoading, isFetching, refetch } = useRecommendationsQuery();
  const { accept, ignore, dismiss } = useRecommendationActionsMutation();
  const insets = useSafeAreaInsets();

  const isRefreshing = isFetching && !isLoading;

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader title="연결 추천" subtitle="항목 간의 지식 연결" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 16,
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
        ) : !recommendations || recommendations.length === 0 ? (
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
              onAccept={() => accept(rec.recommendation.id)}
              onIgnore={() => ignore(rec.recommendation.id)}
              onDismiss={() => dismiss(rec.recommendation.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
