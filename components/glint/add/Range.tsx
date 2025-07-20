import ui from "@/components/ui";
import { Info } from "@/components/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar } from "@/components/icons";
import { useNewGlintStore } from "@/store/useNewGlintStore";
import { transformYYYYMMDD } from "@/lib/date";
import CalenderSelector from "@/components/glint/add/Calender";

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
        <ui.Text className="font-bold">범위 선택</ui.Text>
        <ui.ToolTip>
          <ui.ToolTip.Trigger>
            <Info size={16} />
          </ui.ToolTip.Trigger>
          <ui.ToolTip.Content align="start" insets={contentInsets}>
            <ui.Text>
              범위를 선택하여 반짝임을 추가할 수 있습니다. 범위는 날짜에 따라
              설정할 수 있습니다.
            </ui.Text>
          </ui.ToolTip.Content>
        </ui.ToolTip>
      </ui.View>
      <ui.View className="border border-input rounded mt-2 items-center justify-between">
        <ui.View className="p-2">
          <Calendar />
        </ui.View>
        <CalenderSelector
          className="flex-1"
          disabledAt={disabledAt}
          showedAt={showedAt}
          onChange={(date) => {
            if (new Date(date).getDate() < new Date(disabledAt).getDate()) {
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
            if (new Date(date).getDate() > new Date(showedAt).getDate()) {
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
