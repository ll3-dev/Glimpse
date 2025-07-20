import ui from "@/components/ui";
import { useGlintQuery } from "@/hooks/db/useGlintQuery";
import { transformYYYYMMDD } from "@/lib/date";
import { FlashList } from "@shopify/flash-list";
import { View } from "react-native";

export default function GlintList() {
  const { data: glints, isFetching } = useGlintQuery();

  if (isFetching) return null;

  return (
    <FlashList
      contentContainerClassName="py-4"
      refreshing
      renderItem={({ item: glint }) => (
        <View className="flex-row items-start justify-between py-2 px-4 gap-4">
          <ui.Text
            className="text-foreground flex-1"
            ellipsizeMode="tail"
            numberOfLines={1}
          >
            {glint.content}
          </ui.Text>
          <ui.Text className="text-foreground">
            {transformYYYYMMDD(new Date(glint.updatedAt))}
          </ui.Text>
        </View>
      )}
      data={glints}
      estimatedItemSize={50}
    />
  );
}
