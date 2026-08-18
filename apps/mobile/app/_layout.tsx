import "../global.css";
import "@/src/lib/init";

import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useCallback, useEffect, useState } from "react";
import { LogBox, Platform, View, Text, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AlertTriangle, RefreshCw } from "lucide-react-native";

import { useAppForegroundLabeling, useWarmLocalLLM } from "@/src/hooks";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ensureLabelingBackgroundTaskRegistered } from "@/src/features/labeling";
import { installGlobalErrorTraceLogger, logger } from "@/src/utils/logger";
import { ShareIntentProvider } from "expo-share-intent";
import { ShareIntentNavigator } from "@/src/components/share-intent";
import { GlobalModelDownloadBanner } from "@/src/components/settings/GlobalModelDownloadBanner";
import { initializeCoreClient } from "@/src/features/core/initialize-core-client";
import { useProcessPendingShares } from "@/src/features/share/pending-share-processor";
import { ErrorBoundary } from "@/src/components/common/ErrorBoundary";
import { SuspenseFallback } from "@/src/components/common/SuspenseFallback";

function RootProviders({ children }: { children: React.ReactNode }) {
  useAppForegroundLabeling();
  useWarmLocalLLM();
  useProcessPendingShares();
  return <>{children}</>;
}

function CoreInitErrorFallback({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <View className="flex-1 bg-app-bg items-center justify-center p-6">
      <View className="w-full max-w-sm rounded-2xl border border-app-border bg-app-card p-6 shadow-sm">
        <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-tag-rose-bg/60 border border-tag-rose-text/20">
          <AlertTriangle size={24} color="#eb5757" />
        </View>

        <Text className="text-app-text text-lg font-semibold tracking-tight mb-1">
          데이터베이스 초기화 실패
        </Text>
        <Text className="text-app-muted text-sm leading-relaxed mb-4">
          로컬 저장소를 불러오는 중 문제가 발생했습니다. 앱을 다시 시작하거나 재시도해 주세요.
        </Text>

        {__DEV__ && (
          <View className="max-h-24 mb-4 rounded-lg bg-app-bg p-3 border border-app-border">
            <Text className="text-tag-rose-text text-xs font-mono">
              {error.message}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.8}
          className="flex-row h-11 items-center justify-center rounded-xl bg-app-text px-4 shadow-sm"
        >
          <RefreshCw size={16} color="#f7f6f3" className="mr-2" />
          <Text className="text-app-bg text-sm font-semibold ml-2">
            다시 시도
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
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

  const initCore = useCallback(async () => {
    try {
      setCoreInitError(null);
      await initializeCoreClient();
    } catch (error) {
      logger.error('Failed to initialize mobile core client', error);
      setCoreInitError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsCoreReady(true);
    }
  }, []);

  useEffect(() => {
    installGlobalErrorTraceLogger();
    void initCore();

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
  }, [initCore]);

  if (!isCoreReady) {
    return null;
  }

  if (coreInitError) {
    return <CoreInitErrorFallback error={coreInitError} onRetry={initCore} />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ShareIntentProvider>
            <QueryClientProvider client={queryClient}>
              <RootProviders>
                <Suspense fallback={<SuspenseFallback />}>
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
                </Suspense>
              </RootProviders>
            </QueryClientProvider>
          </ShareIntentProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
