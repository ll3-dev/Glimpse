import GlintList from "@/components/glint/List";
import FloatingActionButton from "@/components/home/FloatingActionButton";
import { Stack } from "expo-router";
import { Suspense } from "react";
import { View } from "react-native";

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Glimpse",
        }}
      />
      <View className="flex-1 bg-secondary/30 text-foreground">
        <Suspense>
          <GlintList />
        </Suspense>
        <FloatingActionButton />
      </View>
    </>
  );
}
