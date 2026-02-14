import { Text, View } from 'react-native';

type LibraryHeaderProps = {
  totalCount: number;
};

export function LibraryHeader({ totalCount }: LibraryHeaderProps) {
  return (
    <View className="px-8 pt-8 pb-6">
      <Text className="text-4xl font-black text-app-text tracking-tighter">보관함</Text>
      <View className="mt-2 flex-row items-center">
        <View className="w-2 h-2 rounded-full bg-app-subtle mr-2" />
        <Text className="text-sm text-app-muted font-bold">{totalCount}개의 지식</Text>
      </View>
    </View>
  );
}
