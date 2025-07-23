import ui from "@/components/ui";
import { Calendar, Info, Sparkle } from "@/components/icons";
import { useGlintByIdQuery } from "@/hooks/db/useGlintQuery";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { transformYYYYMMDD } from "@/lib/date";
import { ScrollView } from "react-native";

interface GlintDetailProps {
  id: string;
}

export default function GlintDetail({ id }: GlintDetailProps) {
  const [{ data: glint }, { data: tags }] = useGlintByIdQuery(id);
  const insets = useSafeAreaInsets();

  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };

  if (!glint) return;

  return (
    <ScrollView>
      <ui.Text.TextClassContext.Provider value="text-foreground">
        <ui.View
          vertical
          className="flex-1 bg-secondary/30 text-foreground p-6 gap-4"
        >
          <ui.Text className="text-xl font-bold">{glint.title}</ui.Text>
          {tags && tags.length > 0 && (
            <ui.View className="gap-4 flex-wrap">
              {tags.map((tag) => (
                <ui.Badge variant="outline" key={tag.id}>
                  <ui.Text>{tag.name}</ui.Text>
                </ui.Badge>
              ))}
            </ui.View>
          )}
          {glint.content && <ui.Text>{glint.content}</ui.Text>}
          <ui.Separator className="mt-4" />
          <ui.View className="items-center gap-4">
            <ui.Text className="font-bold">중요도</ui.Text>
            <ui.View className="flex-1 flex-row items-center gap-2">
              {Array.from({ length: glint.importance - 3 }).map((_, index) => (
                <Sparkle key={index} size={16} className="text-foreground" />
              ))}
            </ui.View>
          </ui.View>
          <ui.View vertical className="flex-1">
            <ui.View className="gap-3 items-center">
              <ui.Text className="font-bold">보여지는 날짜</ui.Text>
              <ui.ToolTip>
                <ui.ToolTip.Trigger>
                  <Info size={16} />
                </ui.ToolTip.Trigger>
                <ui.ToolTip.Content align="start" insets={contentInsets}>
                  <ui.Text>
                    보여지는 날짜는 사용자가 선택한 날짜 범위에 따라 달라집니다.
                  </ui.Text>
                </ui.ToolTip.Content>
              </ui.ToolTip>
            </ui.View>
            <ui.View className="border border-input rounded mt-2 items-center justify-between">
              <ui.View className="p-2">
                <Calendar className="text-foreground" />
              </ui.View>
              <ui.Text className="text-center flex-1">
                {transformYYYYMMDD(new Date(glint.showedAt))}
              </ui.Text>
              <ui.Text className="text-center flex-1">
                {transformYYYYMMDD(new Date(glint.disabledAt))}
              </ui.Text>
            </ui.View>
          </ui.View>
        </ui.View>
      </ui.Text.TextClassContext.Provider>
    </ScrollView>
  );
}
