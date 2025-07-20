import GlintList from "@/components/glint/List";
import FloatingActionButton from "@/components/home/FloatingActionButton";
import { View } from "react-native";

export default function Screen() {
  return (
    <View className="flex-1 bg-secondary/30 text-foreground">
      <GlintList />
      <FloatingActionButton />
    </View>
  );
}
