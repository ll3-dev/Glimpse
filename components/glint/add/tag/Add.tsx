import AddTagDialog from "@/components/glint/add/tag/AddDialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useTagQuery } from "@/hooks/db/useTagQuery";
import { useNewGlintStore } from "@/store/useNewGlintStore";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";

export function AddTag() {
  const { data: tags, isFetching } = useTagQuery();
  const { addTag } = useNewGlintStore((state) => state.actions);
  const router = useRouter();

  if (isFetching) return null;

  return (
    <ScrollView className="flex-1 bg-secondary/30 text-foreground  text-center">
      {tags?.map((tag) => (
        <Button
          key={tag.id}
          variant="ghost"
          className="border-t border-input"
          onPress={() => {
            addTag(tag);
            router.back();
          }}
        >
          <Text>{tag.name}</Text>
        </Button>
      ))}
      <AddTagDialog />
    </ScrollView>
  );
}
