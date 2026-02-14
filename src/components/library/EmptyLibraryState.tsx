import { Text, View } from 'react-native';

export function EmptyLibraryState() {
  return (
    <View className="flex-1 items-center justify-center pt-32">
      <Text className="text-app-subtle text-base font-medium">비어 있습니다.</Text>
    </View>
  );
}
