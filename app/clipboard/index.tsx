import { Stack } from "expo-router";
import { useState } from "react";
import { View, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ui from "@/components/ui";
import { useClipboardQuery } from "@/hooks/db/useClipboardQuery";
import { useClipboard } from "@/hooks/useClipboard";
import { useAddClipboardMutate, useTogglePinClipboard, useDeleteClipboard } from "@/hooks/db/useClipboardMutate";
import { ClipboardCheck, Copy, Pin, PinOff, Trash2 } from "@/components/icons";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function ClipboardScreen() {
  const { data: clipboardItems, isLoading } = useClipboardQuery();
  const { getClipboard, setClipboard } = useClipboard();
  const addClipboard = useAddClipboardMutate();
  const togglePin = useTogglePinClipboard();
  const deleteClipboard = useDeleteClipboard();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Manual clipboard fetch
  const handleFetchClipboard = async () => {
    try {
      const { text, hasContent } = await getClipboard();
      if (hasContent && text.trim()) {
        const type = detectType(text);
        await addClipboard.mutateAsync({
          type,
          content: text,
        });
        Alert.alert("성공", "클립보드 내용을 저장했습니다.");
      } else {
        Alert.alert("알림", "클립보드에 내용이 없습니다.");
      }
    } catch (error) {
      console.error("Failed to fetch clipboard:", error);
      Alert.alert("오류", "클립보드를 가져오는데 실패했습니다.");
    }
  };

  // Copy to clipboard
  const handleCopy = async (content: string) => {
    try {
      await setClipboard(content);
      Alert.alert("성공", "클립보드에 복사되었습니다.");
    } catch {
      Alert.alert("오류", "복사에 실패했습니다.");
    }
  };

  // Toggle pin
  const handleTogglePin = (id: number, currentPinState: boolean) => {
    togglePin.mutate({ id, isPinned: !currentPinState });
  };

  // Delete item
  const handleDelete = (id: number) => {
    Alert.alert(
      "삭제",
      "이 항목을 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => deleteClipboard.mutate(id),
        },
      ]
    );
  };

  const detectType = (content: string): "text" | "url" | "file" => {
    try {
      new URL(content);
      return "url";
    } catch {
      if (content.startsWith("/")) {
        return "file";
      }
      return "text";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "url":
        return "🔗";
      case "file":
      case "image":
        return "📎";
      default:
        return "📝";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "url":
        return "URL";
      case "file":
        return "파일";
      case "image":
        return "이미지";
      default:
        return "텍스트";
    }
  };

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp * 1000), {
      addSuffix: true,
      locale: ko,
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "클립보드",
        }}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView className="flex-1 px-4">
          {/* Manual fetch button */}
          <Pressable
            onPress={handleFetchClipboard}
            className="bg-primary flex-row items-center justify-center gap-2 rounded-xl p-4 mb-4"
          >
            <ClipboardCheck size={20} className="text-primary-foreground" strokeWidth={2.5} />
            <ui.Text className="text-primary-foreground font-medium">
              현재 클립보드 가져오기
            </ui.Text>
          </Pressable>

          {/* Clipboard items */}
          {isLoading ? (
            <View className="items-center justify-center py-12">
              <ui.Text className="text-muted-foreground">로딩 중...</ui.Text>
            </View>
          ) : clipboardItems && clipboardItems.length > 0 ? (
            clipboardItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setSelectedId(selectedId === item.id ? null : item.id)}
                className="bg-card border border-border rounded-xl p-4 mb-3"
              >
                <View className="flex-row items-start gap-3">
                  {/* Type icon */}
                  <View className="text-2xl">{getTypeIcon(item.type)}</View>

                  {/* Content */}
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <ui.Text className="text-xs text-muted-foreground font-medium">
                        {getTypeLabel(item.type)}
                      </ui.Text>
                      {item.isPinned ? (
                        <Pin size={12} className="text-yellow-500" />
                      ) : null}
                      <ui.Text className="text-xs text-muted-foreground">
                        • {formatTime(item.lastCopiedAt)}
                      </ui.Text>
                    </View>

                    <ui.Text className="text-foreground" numberOfLines={selectedId === item.id ? undefined : 2}>
                      {item.content}
                    </ui.Text>

                    {item.copiedCount > 1 ? (
                      <ui.Text className="text-xs text-muted-foreground mt-1">
                        {item.copiedCount}번 복사됨
                      </ui.Text>
                    ) : null}

                    {/* Actions when expanded */}
                    {selectedId === item.id ? (
                      <View className="flex-row items-center gap-2 mt-3">
                        <Pressable
                          onPress={() => handleCopy(item.content)}
                          className="bg-primary flex-row items-center gap-1 rounded-lg px-3 py-2"
                        >
                          <Copy size={16} className="text-primary-foreground" />
                          <ui.Text className="text-primary-foreground text-sm font-medium">
                            복사
                          </ui.Text>
                        </Pressable>

                        <Pressable
                          onPress={() => handleTogglePin(item.id, !!item.isPinned)}
                          className="bg-secondary flex-row items-center gap-1 rounded-lg px-3 py-2"
                        >
                          {item.isPinned ? (
                            <>
                              <PinOff size={16} className="text-foreground" />
                              <ui.Text className="text-foreground text-sm font-medium">
                                고정 해제
                              </ui.Text>
                            </>
                          ) : (
                            <>
                              <Pin size={16} className="text-foreground" />
                              <ui.Text className="text-foreground text-sm font-medium">
                                고정
                              </ui.Text>
                            </>
                          )}
                        </Pressable>

                        <Pressable
                          onPress={() => handleDelete(item.id)}
                          className="bg-destructive/20 flex-row items-center gap-1 rounded-lg px-3 py-2"
                        >
                          <Trash2 size={16} className="text-destructive" />
                          <ui.Text className="text-destructive text-sm font-medium">
                            삭제
                          </ui.Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <View className="items-center justify-center py-12">
              <ui.Text className="text-muted-foreground text-center">
                저장된 클립보드 내용이 없습니다.
                {"\n"}
                위 버튼을 눌러 클립보드 내용을 가져오세요.
              </ui.Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
