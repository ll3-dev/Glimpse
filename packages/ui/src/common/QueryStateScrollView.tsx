import { useEffect, useState, type ReactNode } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

type QueryStateScrollViewProps<T> = {
  data: readonly T[];
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
  emptyTitle: string;
  emptyDescription: string;
  error?: Error | null;
  loadingText?: string;
  topPadding?: number;
  horizontalPadding?: number;
  bottomInset: number;
  /**
   * Progressive rendering: render only the first N items, appending
   * `visibleCountIncrement` more each time the user scrolls near the bottom.
   * Unset (the default) renders the whole list at once — fine for lists that
   * are bounded upstream, wasteful for queries that return everything.
   */
  initialVisibleCount?: number;
  visibleCountIncrement?: number;
};

/**
 * Fire the next chunk this many pixels before the absolute bottom so the
 * user scrolling at typical speed never sees the window edge.
 */
const LOAD_MORE_THRESHOLD_PX = 400;

export function QueryStateScrollView<T>({
  data,
  isLoading,
  isRefreshing,
  onRefresh,
  renderItem,
  keyExtractor,
  emptyTitle,
  emptyDescription,
  error,
  loadingText = "로딩 중...",
  topPadding = 16,
  horizontalPadding = 24,
  bottomInset,
  initialVisibleCount,
  visibleCountIncrement = 10,
}: QueryStateScrollViewProps<T>) {
  const hasData = data.length > 0;
  const showLoading = isLoading;
  const showError = !isLoading && Boolean(error);
  const showEmpty = !isLoading && !error && !hasData;
  const showData = !isLoading && !error && hasData;

  // Windowed rendering state. Reset whenever the data shrinks below the
  // current window (fresh query results, pull-to-refresh) so a stale large
  // window never keeps blank space where items used to be.
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount ?? Infinity);
  const windowed = initialVisibleCount != null;
  useEffect(() => {
    if (windowed && visibleCount > data.length) {
      setVisibleCount(initialVisibleCount);
    }
  }, [windowed, data.length, initialVisibleCount, visibleCount]);

  const clampedCount = windowed
    ? Math.min(visibleCount, data.length)
    : data.length;
  const renderedItems = data.slice(0, clampedCount).map((item) => (
    <View key={keyExtractor(item)}>{renderItem(item)}</View>
  ));
  const hasMore = windowed && clampedCount < data.length;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentSize, layoutMeasurement, contentOffset } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height -
      contentOffset.y -
      layoutMeasurement.height;
    if (hasMore && distanceFromBottom < LOAD_MORE_THRESHOLD_PX) {
      setVisibleCount((count) => count + visibleCountIncrement);
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingTop: topPadding,
        paddingBottom: bottomInset + 80,
        paddingHorizontal: horizontalPadding,
        flexGrow: 1,
      }}
      onScroll={handleScroll}
      scrollEventThrottle={64}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {showLoading && (
        <View className="flex-1 items-center justify-center py-24">
          <Text className="text-app-muted text-sm font-medium">{loadingText}</Text>
        </View>
      )}

      {showError && (
        <View className="flex-1 items-center justify-center px-8 py-24">
          <Text className="text-app-text mb-2 text-lg font-semibold tracking-tight">
            데이터를 불러오지 못했습니다
          </Text>
          <Text className="text-app-muted text-center text-sm">
            {error?.message || "다시 시도해주세요"}
          </Text>
        </View>
      )}

      {showEmpty && (
        <View className="flex-1 items-center justify-center px-8 py-24">
          <Text className="text-app-text mb-2 text-lg font-semibold tracking-tight">
            {emptyTitle}
          </Text>
          <Text className="text-app-muted text-center text-sm leading-relaxed">
            {emptyDescription}
          </Text>
        </View>
      )}

      {showData && renderedItems}
    </ScrollView>
  );
}

