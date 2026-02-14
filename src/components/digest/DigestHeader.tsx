import { View, Text } from 'react-native';

export function DigestHeader() {
  return (
    <View className="border-b border-border px-6 py-4">
      <Text className="text-2xl font-bold text-app-text">
        이번 주 추천
      </Text>
      <Text className="mt-1 text-sm text-muted-foreground">
        저장한 항목 간의 연결을 추천해 드려요
      </Text>
    </View>
  );
}
