import EditGlint from "@/components/glint/Edit";
import { useGlintByIdQuery } from "@/hooks/db/useGlintQuery";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GlintEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: glint } = useGlintByIdQuery(id)[0];
  if (!id) throw new Error("허용되지 않는 접근입니다.");

  return (
    <>
      <Stack.Screen
        options={{
          title: glint?.title ?? "편집",
        }}
      />
      <SafeAreaView className="flex-1">
        <EditGlint id={id} />
      </SafeAreaView>
    </>
  );
}
