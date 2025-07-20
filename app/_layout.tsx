import "@/global.css";
import "@/lib/init";

import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/useColorScheme";
import { PortalHost } from "@rn-primitives/portal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePlatformSpecificSetup } from "@/hooks/useInit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
export { ErrorBoundary } from "expo-router";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "@/drizzle/migrations";
import { SafeAreaView, Text } from "react-native";
import { db } from "@/db";
import { Suspense } from "react";

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

const queryClient = new QueryClient();

export default function RootLayout() {
  usePlatformSpecificSetup();
  const { success, error } = useMigrations(db, migrations);
  const { isDarkColorScheme } = useColorScheme();

  if (error) {
    console.error("Migration error:", error);

    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-secondary/30">
        <Text className="text-foreground p-6 text-lg">
          Migration failed: {error.message}
        </Text>
      </SafeAreaView>
    );
  }
  if (!success) return null;

  return (
    <Suspense>
      <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
          <Stack screenOptions={{ headerBackButtonDisplayMode: "generic" }}>
            <Stack.Screen
              name="index"
              options={{
                title: "Glimpse",
                headerRight: () => <ThemeToggle />,
              }}
            />
            <Stack.Screen
              name="new-glint"
              options={{
                title: "새로운 Glint",
              }}
            />
            <Stack.Screen
              name="new-glint/add-tag"
              options={{
                title: "태그 추가",
              }}
            />
          </Stack>
          <PortalHost />
        </QueryClientProvider>
      </ThemeProvider>
    </Suspense>
  );
}
