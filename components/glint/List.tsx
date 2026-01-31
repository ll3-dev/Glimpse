import ui from "@/components/ui";
import { useGlintQuery } from "@/hooks/db/useGlintQuery";
import { transformYYYYMMDD } from "@/lib/date";
import { cn } from "@/lib/utils";
import { StyledFlashList } from "@/lib/init";
import { Link } from "expo-router";
import { useState } from "react";
import { TouchableOpacity } from "react-native";

export default function GlintList() {
  const { data: glints } = useGlintQuery();
  const [currnetDate] = useState(() => Date.now());

  const filteredGlints = glints?.sort(
    (a, b) =>
      new Date(b.disabledAt).getTime() - new Date(a.disabledAt).getTime()
  );

  return (
    <StyledFlashList
      contentContainerClassName="py-4"
      refreshing
      renderItem={({ item: glint }) => (
        <Link href={`/glint/${glint.id}`} asChild>
          <TouchableOpacity className="px-4 py-2 active:bg-accent">
            <ui.Text.TextClassContext.Provider
              value={cn({
                "text-muted":
                  new Date(glint.disabledAt).getTime() < currnetDate,
              })}
            >
              <ui.View className="flex-row items-start justify-between gap-4">
                <ui.Text
                  className="text-foreground flex-1 text-lg font-semibold"
                  ellipsizeMode="tail"
                  numberOfLines={1}
                >
                  {glint.title}
                </ui.Text>
                <ui.Text className="text-foreground">
                  {transformYYYYMMDD(new Date(glint.updatedAt))}
                </ui.Text>
              </ui.View>
              <ui.Text
                className="text-foreground flex-1"
                ellipsizeMode="tail"
                numberOfLines={1}
              >
                {glint.content}
              </ui.Text>
            </ui.Text.TextClassContext.Provider>
          </TouchableOpacity>
        </Link>
      )}
      data={filteredGlints}
    />
  );
}
