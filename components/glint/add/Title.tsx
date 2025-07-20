import ui from "@/components/ui";
import { useNewGlintStore } from "@/store/useNewGlintStore";

export default function AddGlintTitle() {
  const title = useNewGlintStore((state) => state.title);
  const { set } = useNewGlintStore((state) => state.actions);

  return (
    <ui.View vertical>
      <ui.Text className="font-bold">제목</ui.Text>
      <ui.Input
        placeholder="새로운 반짝임"
        value={title}
        onChangeText={(text) => set("title", text)}
      />
    </ui.View>
  );
}
