import { AddTag } from "@/components/glint/add/tag/Add";
import { PortalHost } from "@rn-primitives/portal";
import { View } from "react-native";

export default function AddTagScreen() {
  return (
    <View className="flex-1 bg-secondary/30 text-foreground">
      <AddTag />
      <PortalHost name="new-glint" />
    </View>
  );
}
