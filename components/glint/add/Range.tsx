import ui from "@/components/ui";
import { Info } from "@/components/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar } from "@/components/icons";
import { useNewGlintStore } from "@/store/useNewGlintStore";
import { transformYYYYMMDD } from "@/lib/date";
import CalenderSelector from "@/components/glint/add/Calendar";

export default function AddRange() {
  const showedAt = useNewGlintStore((state) => state.showedAt);
  const disabledAt = useNewGlintStore((state) => state.disabledAt);
  const { set } = useNewGlintStore((state) => state.actions);
  const insets = useSafeAreaInsets();

  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };

  return (
    <ui.View vertical className="flex-1">
      <ui.View className="gap-3 items-center">
        <ui.Text className="font-bold">보는 날짜</ui.Text>
        <ui.ToolTip>
          <ui.ToolTip.Trigger>
            <Info className="text-foreground" size={16} />
          </ui.ToolTip.Trigger>
          <ui.ToolTip.Content align="start" insets={contentInsets}>
            <ui.Text>범위를 선택하여 보는 날짜를 추가할 수 있습니다.</ui.Text>
          </ui.ToolTip.Content>
        </ui.ToolTip>
      </ui.View>
      <ui.View className="border border-input rounded mt-2 items-center justify-between">
        <ui.View className="p-2">
          <Calendar className="text-foreground" />
        </ui.View>
        <CalenderSelector
          className="flex-1"
          disabledAt={disabledAt}
          showedAt={showedAt}
          onChange={(date) => {
            if (new Date(date) < new Date(disabledAt)) {
              set("showedAt", date);
            }
          }}
        >
          <ui.Button
            className="flex-1 p-2 border-l border-r border-input"
            variant="ghost"
          >
            <ui.Text className="text-center">
              {transformYYYYMMDD(new Date(showedAt))}
            </ui.Text>
          </ui.Button>
        </CalenderSelector>
        <CalenderSelector
          className="flex-1"
          disabledAt={disabledAt}
          showedAt={showedAt}
          onChange={(date) => {
            if (new Date(date) > new Date(showedAt)) {
              set("disabledAt", date);
            }
          }}
        >
          <ui.Button className="flex-1 p-2" variant="ghost">
            <ui.Text className="text-center">
              {transformYYYYMMDD(new Date(disabledAt))}
            </ui.Text>
          </ui.Button>
        </CalenderSelector>
      </ui.View>
    </ui.View>
  );
}
