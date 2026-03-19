/**
 * Digest Screen
 *
 * Displays knowledge connection recommendations.
 * Users can accept, ignore, or dismiss recommendations.
 */

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecommendationsQuery, useRecommendationActionsMutation } from '@/src/hooks';
import { RecommendationCard } from '@/src/components/digest';
import { QueryStateScrollView } from '@glimpse/ui/common';
import { ScreenHeader } from '@glimpse/ui/primitives';

export default function DigestScreen() {
  const {
    data: recommendations,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useRecommendationsQuery();
  const { accept, ignore, dismiss } = useRecommendationActionsMutation();
  const insets = useSafeAreaInsets();

  const isRefreshing = isFetching && !isLoading;
  const items = recommendations ?? [];

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader title="연결 추천" subtitle="항목 간의 지식 연결" />
      <QueryStateScrollView
        data={items}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={() => refetch()}
        error={error}
        bottomInset={insets.bottom}
        emptyTitle="추천이 없습니다"
        emptyDescription={"더 많은 항목을 저장하면\n연결 추천을 받을 수 있어요"}
        keyExtractor={(rec) => rec.recommendation.id}
        renderItem={(rec) => (
          <RecommendationCard
            key={rec.recommendation.id}
            itemA={rec.itemA}
            itemB={rec.itemB}
            recommendation={rec.recommendation}
            onAccept={() => accept(rec.recommendation.id)}
            onIgnore={() => ignore(rec.recommendation.id)}
            onDismiss={() => dismiss(rec.recommendation.id)}
          />
        )}
      />
    </View>
  );
}
