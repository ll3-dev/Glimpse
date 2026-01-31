import { Stack } from "expo-router";
import { View } from "react-native";
import ui from "@/components/ui";

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Glimpse",
        }}
      />
      <View className="flex-1 bg-secondary/30 text-foreground">
        <ui.Text>안녕하세요</ui.Text>
      </View>
    </>
  );
}
