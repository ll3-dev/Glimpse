import "../global.css";
import "@/src/lib/init";

import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, startTransition, useCallback, useEffect, useState } from "react";
import { LogBox, Platform, View, Text, Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AlertTriangle, RefreshCw } from "lucide-react-native";

import {
  useAppForegroundLabeling,
  useAppForegroundRecommendations,
  useAppReviewReminder,
  useRecoverLocalModelDownload,
  useReleaseLocalLLMOnPressure,
  useWarmLocalLLM,
  useAutoSync,
} from "@/src/hooks";
import { CoreClientContext } from "@glimpse/hooks";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ensureLabelingBackgroundTaskRegistered } from "@/src/features/labeling";
import { installGlobalErrorTraceLogger, logger } from "@/src/utils/logger";
import { ShareIntentProvider } from "expo-share-intent";
import { ShareIntentNavigator } from "@/src/components/share-intent";
import { GlobalModelDownloadBanner } from "@/src/components/settings/GlobalModelDownloadBanner";
import { initializeCoreClient } from "@/src/features/core/initialize-core-client";
import { nativeCoreClient } from "@/src/features/core/native-core-client";
import { ensureBYOKHydrated } from "@/src/stores/settings/byok.store";
import { useProcessPendingShares } from "@/src/features/share/pending-share-processor";
import { ErrorBoundary } from "@/src/components/common/ErrorBoundary";
import { SuspenseFallback } from "@/src/components/common/SuspenseFallback";
import { Toast } from "@/src/components/common/Toast";
import { useSemanticColor } from "@glimpse/ui";
import { ensureSyncBackgroundTaskRegistered } from "@/src/features/sync";
import { useLabelingBackfill } from "@glimpse/hooks";
import { mobileBackfillStorage } from "@/src/features/labeling/backfill-storage";

function RootProviders({ children }: { children: React.ReactNode }) {
  useAppForegroundLabeling();
  useAppForegroundRecommendations();
  useRecoverLocalModelDownload();
  useWarmLocalLLM();
  useReleaseLocalLLMOnPressure();
  useProcessPendingShares();
  useAutoSync();
  useAppReviewReminder();
  // CoreClientContext.Provider(nativeCoreClient) 안에서 실행된다
  useLabelingBackfill(mobileBackfillStorage);
  return <>{children}</>;
}

function CoreInitErrorFallback({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const appAccent = useSemanticColor("appAccent");
  const appBg = useSemanticColor("appBg");

  return (
    <View className="flex-1 bg-app-bg items-center justify-center p-6">
      <View className="w-full max-w-sm rounded-2xl border border-app-border bg-app-card p-6 shadow-sm">
        <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-tag-rose-bg/60 border border-tag-rose-text/20">
          <AlertTriangle size={24} color={appAccent} />
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="데이터베이스 초기화 다시 시도"
          onPress={onRetry}
          className="flex-row min-h-11 items-center justify-center rounded-xl bg-app-text px-4 shadow-sm active:opacity-80"
        >
          <RefreshCw size={16} color={appBg} className="mr-2" />
          <Text className="text-app-bg text-sm font-semibold ml-2">
            다시 시도
          </Text>
        </Pressable>
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
    // BYOK 키 복원을 부트스트랩 게이트에 병렬 편입 — 코어 초기화와
    // 함께 기다려 콜드스타트 직후 BYOK 실행이 키 null로 거부되거나
    // 스텁 타깃으로 폴백하는 레이스를 제거한다. 복원 실패는 게이트를
    // 깨지 않는다(ensureBYOKHydrated가 내부에서 처리).
    let initError: Error | null = null;
    await Promise.all([initializeCoreClient(), ensureBYOKHydrated()]).catch(
      (error) => {
        logger.error('Failed to initialize mobile core client', error);
        initError = error instanceof Error ? error : new Error(String(error));
      },
    );
    // setState를 effect 동기 경로 밖(마이크로태스크 후반)으로 밀어
    // cascading render(set-state-in-effect) 위반을 피한다.
    // 재시도 성공 시에도 여기서 폴백 UI가 해제된다.
    startTransition(() => {
      setCoreInitError(initError);
      setIsCoreReady(true);
    });
  }, []);

  useEffect(() => {
    installGlobalErrorTraceLogger();
    void initCore();

    void ensureLabelingBackgroundTaskRegistered().catch((error) => {
      logger.error('Failed to register labeling background task', error);
    });

    void ensureSyncBackgroundTaskRegistered().catch((error) => {
      logger.error('Failed to register desktop sync background task', error);
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
              <CoreClientContext.Provider value={nativeCoreClient}>
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
                      <Stack.Screen name="local-models" />
                      <Stack.Screen name="library/[id]" />
                    </Stack>
                    <GlobalModelDownloadBanner />
                  </Suspense>
                </RootProviders>
              </CoreClientContext.Provider>
            </QueryClientProvider>
          </ShareIntentProvider>
          <Toast />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
