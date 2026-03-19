import { Activity, type ReactNode } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

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
};

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
}: QueryStateScrollViewProps<T>) {
  const KeyedView = View as any;
  const hasData = data.length > 0;
  const showLoading = isLoading;
  const showError = !isLoading && Boolean(error);
  const showEmpty = !isLoading && !error && !hasData;
  const showData = !isLoading && !error && hasData;
  const renderedItems = data.map((item) => (
    <KeyedView key={keyExtractor(item)}>{renderItem(item)}</KeyedView>
  ));

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingTop: topPadding,
        paddingBottom: bottomInset + 100,
        paddingHorizontal: horizontalPadding,
      }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <Activity mode={showLoading ? "visible" : "hidden"}>
        <View className="items-center justify-center py-24">
          <Text className="text-muted-foreground text-sm font-medium">{loadingText}</Text>
        </View>
      </Activity>

      <Activity mode={showError ? "visible" : "hidden"}>
        <View className="items-center justify-center px-8 py-24">
          <Text className="text-app-text mb-2 text-lg font-semibold tracking-tight">
            데이터를 불러오지 못했습니다
          </Text>
          <Text className="text-muted-foreground text-center text-sm">
            {error?.message || "다시 시도해주세요"}
          </Text>
        </View>
      </Activity>

      <Activity mode={showEmpty ? "visible" : "hidden"}>
        <View className="items-center justify-center px-8 py-24">
          <Text className="text-app-text mb-2 text-lg font-semibold tracking-tight">
            {emptyTitle}
          </Text>
          <Text className="text-muted-foreground text-center text-sm">
            {emptyDescription}
          </Text>
        </View>
      </Activity>

      <Activity mode={showData ? "visible" : "hidden"}>
        {renderedItems}
      </Activity>
    </ScrollView>
  );
}
