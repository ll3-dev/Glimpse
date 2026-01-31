import AddGlint from "@/components/glint/add";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NewGlintScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "새로운 Glint",
        }}
      />
      <SafeAreaView className="flex-1">
        <AddGlint />
      </SafeAreaView>
    </>
  );
}
