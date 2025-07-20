import ui from "@/components/ui";
import AddGlintTags from "@/components/glint/add/tag";
import AddGlintImportance from "@/components/glint/add/Importance";
import AddGlintTitle from "@/components/glint/add/Title";
import AddGlintContent from "@/components/glint/Content";
import AddRange from "@/components/glint/add/Range";
import { ScrollView } from "react-native";
import { useEffect } from "react";
import { useNewGlintStore } from "@/store/useNewGlintStore";
import { useAddGlintMutate } from "@/hooks/db/useGlintMutate";
import { useRouter } from "expo-router";

export default function AddGlint() {
  const { reset } = useNewGlintStore((state) => state.actions);
  const { mutate: addGlint } = useAddGlintMutate();
  const route = useRouter();

  const onNewGlint = () => {
    const { title, content, tags, importance, showedAt, disabledAt } =
      useNewGlintStore.getState();

    addGlint({
      title,
      content,
      tags,
      importance,
      showedAt,
      disabledAt,
    });
    reset();
    route.dismissAll();
  };

  useEffect(() => {
    reset();
  }, []);

  return (
    <ui.View vertical className="flex-1 bg-secondary/30 text-foreground">
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ rowGap: 24 }}>
        <AddGlintTitle />
        <AddGlintTags />
        <AddGlintContent />
        <ui.Separator className="my-4" />
        <AddGlintImportance />
        <AddRange />
      </ScrollView>
      <ui.View className="p-6 w-full">
        <ui.Button className="w-full" onPress={onNewGlint}>
          <ui.Text className="text-lg">추가</ui.Text>
        </ui.Button>
      </ui.View>
    </ui.View>
  );
}
