import { Text, View, TouchableOpacity } from 'react-native';
import { Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type LibraryHeaderProps = {
  totalCount: number;
};

export function LibraryHeader({ totalCount }: LibraryHeaderProps) {
  const router = useRouter();

  return (
    <View className="px-6 pt-8 pb-4 flex-row items-center justify-between">
      <View>
        <Text className="text-3xl font-bold text-app-text tracking-tight">보관함</Text>
        <View className="mt-2 flex-row items-center">
          <View className="w-1.5 h-1.5 rounded-full bg-app-subtle mr-2" />
          <Text className="text-sm text-app-muted font-medium">{totalCount}개의 지식</Text>
        </View>
      </View>
      <TouchableOpacity
        className="p-2.5 rounded-md bg-app-border/30"
        onPress={() => router.push('/settings')}
      >
        <Settings size={20} color="#37352f" />
      </TouchableOpacity>
    </View>
  );
}
