import ui from "@/components/ui";
import { X } from "@/components/icons";
import { useNewGlintStore } from "@/store/useNewGlintStore";
import { Link } from "expo-router";

export default function AddGlintTags() {
  const tags = useNewGlintStore((state) => state.tags);
  const { removeTag } = useNewGlintStore((state) => state.actions);

  return (
    <ui.View vertical>
      <ui.View className="items-center justify-between">
        <ui.Text className="font-bold">태그</ui.Text>
        <Link href="/new-glint/add-tag" asChild>
          <ui.Button variant="ghost" className="text-sm">
            <ui.Text>추가</ui.Text>
          </ui.Button>
        </Link>
      </ui.View>
      <ui.View className="flex-wrap gap-2 rounded-lg bg-secondary/30">
        {tags?.map((tag, index) => (
          <ui.Button
            key={index}
            className="flex-row justify-center items-center rounded-full gap-1"
            variant="outline"
            onPress={() => {
              removeTag(index);
            }}
          >
            <ui.Text>{tag.name}</ui.Text>
            <X size={16} className="text-foreground/60" />
          </ui.Button>
        ))}
      </ui.View>
    </ui.View>
  );
}
