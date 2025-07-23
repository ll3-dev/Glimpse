import ui from "@/components/ui";
import { Info, Sparkle } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useNewGlintStore } from "@/store/useNewGlintStore";

export default function AddGlintImportance() {
  const importance = useNewGlintStore((state) => state.importance);
  const { set } = useNewGlintStore((state) => state.actions);

  return (
    <ui.View vertical className="gap-2">
      <ui.View className="items-center gap-3">
        <ui.Text className="font-bold">중요도</ui.Text>
        <ui.ToolTip>
          <ui.ToolTip.Trigger>
            <Info className="text-foreground" size={16} />
          </ui.ToolTip.Trigger>
          <ui.ToolTip.Content align="start">
            <ui.Text>Glint가 화면에 더 자주 나옵니다.</ui.Text>
          </ui.ToolTip.Content>
        </ui.ToolTip>
      </ui.View>
      <ui.View className="items-center justify-between">
        {Array.from({ length: 3 }).map((_, index) => (
          <ui.Button
            key={index}
            className="flex-1 flex-row items-center justify-center gap-2"
            onPress={() => set("importance", index + 4)}
            variant={importance === index + 4 ? "default" : "ghost"}
          >
            {Array.from({ length: index + 1 }).map((_, key) => (
              <Sparkle
                key={key}
                size={16}
                className={cn("text-foreground", {
                  "text-background": importance === index + 4,
                })}
              />
            ))}
          </ui.Button>
        ))}
      </ui.View>
    </ui.View>
  );
}
