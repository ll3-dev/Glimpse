import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function GlobalRouteError({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      className="flex-1 bg-app-bg items-center justify-center p-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="w-full max-w-sm rounded-2xl border border-app-border bg-app-card p-6 shadow-sm">
        <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-tag-rose-bg/60 border border-tag-rose-text/20">
          <AlertTriangle size={24} color="#eb5757" />
        </View>

        <Text className="text-app-text text-lg font-semibold tracking-tight mb-1">
          화면을 표시할 수 없습니다
        </Text>
        <Text className="text-app-muted text-sm leading-relaxed mb-4">
          요청하신 화면으로 이동하는 중 문제가 발생했습니다.
        </Text>

        {__DEV__ && (
          <ScrollView
            className="max-h-32 mb-4 rounded-lg bg-app-bg p-3 border border-app-border"
            nestedScrollEnabled
          >
            <Text className="text-tag-rose-text text-xs font-mono">
              {error?.message || '알 수 없는 오류'}
            </Text>
            {error?.stack && (
              <Text className="text-app-subtle text-[10px] font-mono mt-1">
                {error.stack}
              </Text>
            )}
          </ScrollView>
        )}

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={retry}
            activeOpacity={0.8}
            className="flex-1 flex-row h-11 items-center justify-center rounded-xl bg-app-text px-4 shadow-sm"
          >
            <RefreshCw size={16} color="#f7f6f3" className="mr-2" />
            <Text className="text-app-bg text-sm font-semibold ml-1.5">
              다시 시도
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
            className="flex-row h-11 items-center justify-center rounded-xl border border-app-border bg-app-card px-4"
          >
            <Home size={16} color="#37352f" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
