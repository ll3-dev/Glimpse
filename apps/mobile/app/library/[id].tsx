import { Activity } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ExternalLink } from "lucide-react-native";
import {
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKnowledgeItemsQuery } from "@/src/hooks";
import { formatKnowledgeLabel, getDisplayLabels } from "@/src/features/labeling";
import { Card, ScreenHeader } from "@glimpse/ui/primitives";

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "note":
      return "메모";
    case "link":
      return "링크";
    case "highlight":
      return "하이라이트";
    case "screenshot":
      return "스크린샷";
    case "share":
      return "공유";
    default:
      return "항목";
  }
}

export default function LibraryDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const itemId = readParam(params.id);
  const { data: items, isLoading } = useKnowledgeItemsQuery();
  const item = items?.find((entry) => entry.id === itemId);
  const showLoading = isLoading;
  const showMissing = !isLoading && !item;
  const showItem = !isLoading && Boolean(item);
  const displayLabels = item ? getDisplayLabels(item) : [];

  return (
    <View className="bg-app-bg flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="보관함 상세"
        leftElement={
          <TouchableOpacity onPress={() => router.back()} className="-ml-2 p-2">
            <ArrowLeft size={24} color="#37352f" />
          </TouchableOpacity>
        }
      />

      <Activity mode={showLoading ? "visible" : "hidden"}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-app-muted text-base">불러오는 중...</Text>
        </View>
      </Activity>

      <Activity mode={showMissing ? "visible" : "hidden"}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-app-muted text-base">
            항목을 찾을 수 없습니다.
          </Text>
        </View>
      </Activity>

      <Activity mode={showItem ? "visible" : "hidden"}>
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <Card className="mb-3 p-4">
            <Text className="text-app-muted text-[11px] font-semibold tracking-tight">
              {item ? getTypeLabel(item.type) : ""}
            </Text>
            <Text className="text-app-text mt-2 text-lg font-bold">
              {item ? item.title || item.body || item.url || "제목 없음" : ""}
            </Text>
            <Text className="text-app-muted mt-2 text-xs">
              {item ? format(item.createdAt, "yyyy.MM.dd HH:mm", { locale: ko }) : ""}
            </Text>
          </Card>

          <Activity mode={item?.body ? "visible" : "hidden"}>
            <Card className="mb-3 p-4">
              <Text className="text-app-muted text-[11px] font-semibold tracking-tight">
                내용
              </Text>
              <Text className="text-app-text mt-2 text-sm leading-6">
                {item?.body}
              </Text>
            </Card>
          </Activity>

          <Activity mode={item?.url ? "visible" : "hidden"}>
            <Card className="mb-3 p-4">
              <Text className="text-app-muted text-[11px] font-semibold tracking-tight">
                링크
              </Text>
              <TouchableOpacity
                className="mt-2 flex-row items-center"
                onPress={() => item?.url && Linking.openURL(item.url)}
              >
                <Text
                  className="flex-1 text-sm text-blue-600"
                  numberOfLines={2}
                >
                  {item?.url}
                </Text>
                <ExternalLink size={16} color="#2563eb" />
              </TouchableOpacity>
            </Card>
          </Activity>

          <Activity mode={item?.summary ? "visible" : "hidden"}>
            <Card className="mb-3 p-4">
              <Text className="text-app-muted text-[11px] font-semibold tracking-tight">
                요약
              </Text>
              <Text className="text-app-text mt-2 text-sm leading-6">
                {item?.summary}
              </Text>
            </Card>
          </Activity>

          <Activity mode={displayLabels.length > 0 ? "visible" : "hidden"}>
            <Card className="mb-3 p-4">
              <Text className="text-app-muted text-[11px] font-semibold tracking-tight">
                라벨
              </Text>
              <View className="mt-2 flex-row flex-wrap">
                {displayLabels.map((label) => (
                  <View
                    key={label}
                    className="bg-app-border/40 mr-2 mb-2 rounded px-2 py-1"
                  >
                    <Text className="text-app-muted text-xs">
                      {formatKnowledgeLabel(label)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </Activity>

          <Activity mode={item?.tags && item.tags.length > 0 ? "visible" : "hidden"}>
            <Card className="mb-3 p-4">
              <Text className="text-app-muted text-[11px] font-semibold tracking-tight">
                태그
              </Text>
              <View className="mt-2 flex-row flex-wrap">
                {item?.tags?.map((tag) => (
                  <View
                    key={tag}
                    className="bg-app-border/40 mr-2 mb-2 rounded px-2 py-1"
                  >
                    <Text className="text-app-muted text-xs">#{tag}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </Activity>
        </ScrollView>
      </Activity>
    </View>
  );
}
