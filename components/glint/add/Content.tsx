import ui from "@/components/ui";
import { useNewGlintStore } from "@/store/useNewGlintStore";

export default function AddGlintContent() {
  const content = useNewGlintStore((state) => state.content);
  const { set } = useNewGlintStore((state) => state.actions);

  return (
    <ui.View vertical>
      <ui.Text className="font-bold">내용</ui.Text>
      <ui.Textarea
        className="py-4 px-6 bg-secondary/30 rounded-lg border border-input"
        value={content}
        onChangeText={(text) => set("content", text)}
      />
    </ui.View>
  );
}
