import { Fragment, type ReactNode } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

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
  loadingText = '로딩 중...',
  topPadding = 16,
  horizontalPadding = 24,
  bottomInset,
}: QueryStateScrollViewProps<T>) {
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
      {isLoading ? (
        <View className="items-center justify-center py-20">
          <Text className="text-muted-foreground">{loadingText}</Text>
        </View>
      ) : error ? (
        <View className="items-center justify-center px-8 py-20">
          <Text className="mb-2 text-lg font-medium text-app-text">
            데이터를 불러오지 못했습니다
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            {error.message || '다시 시도해주세요'}
          </Text>
        </View>
      ) : data.length === 0 ? (
        <View className="items-center justify-center px-8 py-20">
          <Text className="mb-2 text-lg font-medium text-app-text">{emptyTitle}</Text>
          <Text className="text-center text-sm text-muted-foreground">{emptyDescription}</Text>
        </View>
      ) : (
        data.map((item) => (
          <Fragment key={keyExtractor(item)}>
            {renderItem(item)}
          </Fragment>
        ))
      )}
    </ScrollView>
  );
}
