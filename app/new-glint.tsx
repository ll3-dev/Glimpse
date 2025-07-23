import AddGlint from "@/components/glint/add";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native";

export default function NewGlintScreen() {
  return (
    <>
      <Stack.Screen
        name="new-glint"
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
