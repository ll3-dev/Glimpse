import { Stack, useRouter } from "expo-router";
import { View, Pressable } from "react-native";
import ui from "@/components/ui";
import { Clipboard, Sparkle } from "@/components/icons";

export default function Screen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Glimpse",
        }}
      />
      <View className="flex-1 bg-background px-4 pt-8">
        <View className="items-center mb-8">
          <Sparkle size={48} className="text-primary mb-4" strokeWidth={2} />
          <ui.Text className="text-2xl font-bold text-foreground mb-2">
            Glimpse
          </ui.Text>
          <ui.Text className="text-muted-foreground text-center">
            당신의 생각을 저장하고 관리하세요
          </ui.Text>
        </View>

        {/* Clipboard History Card */}
        <Pressable
          onPress={() => router.push("/clipboard")}
          className="bg-card border border-border rounded-2xl p-6 mb-4 active:opacity-80"
        >
          <View className="flex-row items-center gap-4">
            <View className="bg-primary/20 p-3 rounded-xl">
              <Clipboard size={28} className="text-primary" strokeWidth={2.5} />
            </View>
            <View className="flex-1">
              <ui.Text className="text-foreground font-semibold text-lg mb-1">
                클립보드 히스토리
              </ui.Text>
              <ui.Text className="text-muted-foreground text-sm">
                복사한 내용들을 자동으로 저장하세요
              </ui.Text>
            </View>
          </View>
        </Pressable>

        {/* Coming Soon Cards */}
        <View className="bg-card/50 border border-border/50 rounded-2xl p-6 mb-4 opacity-60">
          <View className="flex-row items-center gap-4">
            <View className="bg-secondary p-3 rounded-xl">
              <Sparkle
                size={28}
                className="text-muted-foreground"
                strokeWidth={2}
              />
            </View>
            <View className="flex-1">
              <ui.Text className="text-foreground font-semibold text-lg mb-1">
                Glint (곧 출시)
              </ui.Text>
              <ui.Text className="text-muted-foreground text-sm">
                생각을 위젯으로 표시하세요
              </ui.Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}
