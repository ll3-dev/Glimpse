import "../global.css";

import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogBox, Platform } from "react-native";

import { SafeAreaProvider } from "react-native-safe-area-context";
import { installGlobalErrorTraceLogger } from "@/src/utils/logger";
import { ShareIntentProvider } from "expo-share-intent";

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    installGlobalErrorTraceLogger();

    // iOS simulator can emit noisy CoreHaptics keyboard logs that are not app failures.
    if (__DEV__ && Platform.OS === "ios") {
      LogBox.ignoreLogs([
        "CHHapticPattern",
        "hapticpatternlibrary.plist",
        "_UIKBFeedbackGenerator",
      ]);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ShareIntentProvider>
        <QueryClientProvider client={queryClient}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </QueryClientProvider>
      </ShareIntentProvider>
    </SafeAreaProvider>
  );
}
