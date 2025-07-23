import { AddTag } from "@/components/glint/add/tag/Add";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function AddTagScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "태그 추가",
        }}
      />
      <View className="flex-1 bg-secondary/30 text-foreground">
        <AddTag />
        <PortalHost name="new-glint" />
      </View>
    </>
  );
}
