import { SafeAreaView, TouchableOpacity } from "react-native";
import GlintDetail from "@/components/glint/Detail";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Suspense } from "react";
import ui from "@/components/ui";
import { SquarePen } from "@/components/icons";
import { useGlintByIdQuery } from "@/hooks/db/useGlintQuery";

export default function GlintScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: glint } = useGlintByIdQuery(id)[0];
  if (!id) return null; // Handle the case where id is not provided

  return (
    <>
      <Stack.Screen
        options={{
          title: glint?.title ?? "Glint Detail",
          headerRight: () => (
            <Link href={`/glint/edit/${id}`} asChild>
              <TouchableOpacity className="flex-row justify-center items-center gap-2">
                <SquarePen className="text-foreground" size={16} />
                <ui.Text>편집</ui.Text>
              </TouchableOpacity>
            </Link>
          ),
        }}
      />
      <SafeAreaView className="flex-1 bg-background">
        <Suspense>
          <GlintDetail id={id} />
        </Suspense>
      </SafeAreaView>
    </>
  );
}
