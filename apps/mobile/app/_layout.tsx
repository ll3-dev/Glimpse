import "../global.css";
import "@/src/lib/init";

import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useAppForegroundLabeling, useWarmLocalLLM } from "@/src/hooks";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ensureLabelingBackgroundTaskRegistered } from "@/src/features/labeling";
import { installGlobalErrorTraceLogger, logger } from "@/src/utils/logger";
import { ShareIntentProvider } from "expo-share-intent";
import { ShareIntentNavigator } from "@/src/components/share-intent";
import { GlobalModelDownloadBanner } from "@/src/components/settings/GlobalModelDownloadBanner";
import { initializeCoreClient } from "@/src/features/core/initialize-core-client";
import { useProcessPendingShares } from "@/src/features/share/pending-share-processor";

function RootProviders({ children }: { children: React.ReactNode }) {
  useAppForegroundLabeling();
  useWarmLocalLLM();
  useProcessPendingShares();
  return <>{children}</>;
}

export default function RootLayout() {
  const [coreInitError, setCoreInitError] = useState<Error | null>(null);
  const [isCoreReady, setIsCoreReady] = useState(false);
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
    void initializeCoreClient()
      .catch((error) => {
        logger.error('Failed to initialize mobile core client', error);
        setCoreInitError(error instanceof Error ? error : new Error(String(error)));
      })
      .finally(() => {
        setIsCoreReady(true);
      });

    void ensureLabelingBackgroundTaskRegistered().catch((error) => {
      logger.error('Failed to register labeling background task', error);
    });

    // iOS simulator can emit noisy CoreHaptics keyboard logs that are not app failures.
    if (__DEV__ && Platform.OS === "ios") {
      LogBox.ignoreLogs([
        "CHHapticPattern",
        "hapticpatternlibrary.plist",
        "_UIKBFeedbackGenerator",
      ]);
    }
  }, []);

  if (!isCoreReady) {
    return null;
  }
  if (coreInitError) {
    throw coreInitError;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ShareIntentProvider>
          <QueryClientProvider client={queryClient}>
            <RootProviders>
              <>
                <ShareIntentNavigator />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    freezeOnBlur: true,
                  }}
                >
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="capture" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="library/[id]" />
                </Stack>
                <GlobalModelDownloadBanner />
              </>
            </RootProviders>
          </QueryClientProvider>
        </ShareIntentProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
