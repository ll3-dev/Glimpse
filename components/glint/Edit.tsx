import { useGlintByIdQuery } from "@/hooks/db/useGlintQuery";
import { useNewGlintStore } from "@/store/useNewGlintStore";
import { ScrollView } from "react-native";
import ui from "@/components/ui";
import AddGlintTitle from "@/components/glint/add/Title";
import AddGlintTags from "@/components/glint/add/tag";
import AddGlintContent from "@/components/glint/add/Content";
import AddGlintImportance from "@/components/glint/add/Importance";
import AddRange from "@/components/glint/add/Range";
import { useEffect } from "react";
import { useEditGlintMutate } from "@/hooks/db/useGlintMutate";
import { useRouter } from "expo-router";

interface EditGlintProps {
  id: string;
}

export default function EditGlint({ id }: EditGlintProps) {
  const [{ data: glint }, { data: tags }] = useGlintByIdQuery(id);
  const { setGlint, reset } = useNewGlintStore((state) => state.actions);
  const { mutate: editGlint } = useEditGlintMutate();
  const route = useRouter();
  if (!id) return null; // Handle the case where id is not provided

  useEffect(() => {
    if (!glint) return;
    setGlint({
      id: glint.id,
      title: glint.title,
      content: glint.content,
      importance: glint.importance,
      showedAt: glint.showedAt,
      disabledAt: glint.disabledAt,
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name || "",
      })),
    });
  }, [glint, tags]);

  const onEditGlint = () => {
    const { id, title, content, tags, importance, showedAt, disabledAt } =
      useNewGlintStore.getState();

    editGlint({
      id,
      title,
      content,
      tags,
      importance,
      showedAt,
      disabledAt,
    });
    reset();
    route.dismiss();
  };

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
        <ui.Button className="w-full" onPress={onEditGlint}>
          <ui.Text className="text-lg">수정</ui.Text>
        </ui.Button>
      </ui.View>
    </ui.View>
  );
}
