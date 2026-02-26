import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKnowledgeItemsQuery } from '@/src/hooks';
import { Card, ScreenHeader } from '@/src/ui/primitives';

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'note':
      return '메모';
    case 'link':
      return '링크';
    case 'highlight':
      return '하이라이트';
    case 'screenshot':
      return '스크린샷';
    case 'share':
      return '공유';
    default:
      return '항목';
  }
}

export default function LibraryDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const itemId = readParam(params.id);
  const { data: items, isLoading } = useKnowledgeItemsQuery();
  const item = items?.find((entry) => entry.id === itemId);

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="보관함 상세"
        leftElement={
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2"
          >
            <ArrowLeft size={24} color="#37352f" />
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-app-muted text-base">불러오는 중...</Text>
        </View>
      ) : !item ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-app-muted text-base">항목을 찾을 수 없습니다.</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <Card className="p-4 mb-3">
            <Text className="text-[11px] text-app-muted font-semibold tracking-tight">
              {getTypeLabel(item.type)}
            </Text>
            <Text className="mt-2 text-lg font-bold text-app-text">
              {item.title || item.body || item.url || '제목 없음'}
            </Text>
            <Text className="mt-2 text-xs text-app-muted">
              {format(item.createdAt, 'yyyy.MM.dd HH:mm', { locale: ko })}
            </Text>
          </Card>

          {item.body ? (
            <Card className="p-4 mb-3">
              <Text className="text-[11px] text-app-muted font-semibold tracking-tight">내용</Text>
              <Text className="mt-2 text-sm leading-6 text-app-text">{item.body}</Text>
            </Card>
          ) : null}

          {item.url ? (
            <Card className="p-4 mb-3">
              <Text className="text-[11px] text-app-muted font-semibold tracking-tight">링크</Text>
              <TouchableOpacity
                className="mt-2 flex-row items-center"
                onPress={() => Linking.openURL(item.url)}
              >
                <Text className="text-sm text-blue-600 flex-1" numberOfLines={2}>
                  {item.url}
                </Text>
                <ExternalLink size={16} color="#2563eb" />
              </TouchableOpacity>
            </Card>
          ) : null}

          {item.summary ? (
            <Card className="p-4 mb-3">
              <Text className="text-[11px] text-app-muted font-semibold tracking-tight">요약</Text>
              <Text className="mt-2 text-sm leading-6 text-app-text">{item.summary}</Text>
            </Card>
          ) : null}

          {item.tags && item.tags.length > 0 ? (
            <Card className="p-4 mb-3">
              <Text className="text-[11px] text-app-muted font-semibold tracking-tight">태그</Text>
              <View className="mt-2 flex-row flex-wrap">
                {item.tags.map((tag) => (
                  <View
                    key={tag}
                    className="mr-2 mb-2 rounded bg-app-border/40 px-2 py-1"
                  >
                    <Text className="text-xs text-app-muted">#{tag}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
