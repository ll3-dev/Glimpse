import { useGlimpseQuery } from "@/hooks/db/useGlintQuery";
import { Text, View } from "react-native";

export default function GlimpseList() {
  const { data: glimpses } = useGlimpseQuery();

  return (
    <View style={{ padding: 20, gap: 10 }}>
      {glimpses?.map((glimpse) => (
        <Text key={glimpse.id}>{glimpse.content}</Text>
      ))}
    </View>
  );
}
