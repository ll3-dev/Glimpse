import { useMemo, useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { ActivityIndicator, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, CircleAlert, ChevronRight } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { Progress } from '@glimpse/ui/primitives/progress';
import { useSemanticColor } from '@glimpse/ui';
import {
  cancelLocalModelDownload,
  downloadLocalModel,
  markDownloadCompletionHandled,
  useLocalLLMConfig,
  setLocalLLMBannerDismissed,
} from '@/src/features/settings';
import { getModelById } from '@/src/features/ai/model-manager';
import { cn } from '@/src/lib/utils';
import { MarqueeText } from '@/src/components/common/MarqueeText';
import { useGlobalModelDownloadBannerAnimation } from './useGlobalModelDownloadBannerAnimation';

export function GlobalModelDownloadBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const appText = useSemanticColor('appText');
  const appSubtle = useSemanticColor('appSubtle');
  const appAccent = useSemanticColor('appAccent');
  const {
    availableModels,
    downloadStatus,
    downloadProgress,
    downloadError,
    downloadingModelId,
    lastCompletedModelId,
    downloadCompletionHandled,
    isBannerDismissed,
  } = useLocalLLMConfig((config) => config);

  const activeModelName = useMemo(() => {
    const targetId =
      downloadStatus === 'completed' ? lastCompletedModelId : downloadingModelId;
    return availableModels.find((model) => model.id === targetId)?.name ?? '로컬 모델';
  }, [availableModels, downloadStatus, downloadingModelId, lastCompletedModelId]);

  const bannerTitle = useMemo(() => {
    if (downloadStatus === 'downloading') return `${activeModelName} 다운로드 중`;
    if (downloadStatus === 'completed') return `${activeModelName} 준비 완료`;
    return '다운로드 오류 발생';
  }, [activeModelName, downloadStatus]);

  const { animatedStyle, chipAnimatedStyle, gesture, isRendered } =
    useGlobalModelDownloadBannerAnimation({
      downloadStatus,
      downloadCompletionHandled,
      isBannerDismissed,
    });

  const isTabScreen = useMemo(() => {
    const tabRoutes = ['/library', '/chat', '/review', '/digest', '/'];
    return tabRoutes.includes(pathname);
  }, [pathname]);

  const isLibraryScreen = pathname === '/library' || pathname === '/';

  // Position it above the FAB (which is at +16-20)
  const bottomOffset = isTabScreen ? insets.bottom + 85 : insets.bottom + 20;

  // Reset dismissal when status changes to something new
  useEffect(() => {
    if (downloadStatus === 'completed' || downloadStatus === 'error') {
      setLocalLLMBannerDismissed(false);
    }
  }, [downloadStatus]);

  const handlePress = () => {
    if (downloadStatus === 'completed') {
      markDownloadCompletionHandled();
      router.push('/local-models');
    } else if (downloadStatus === 'error') {
      // 실패한 모델을 찾아 재다운로드 — per-model downloadError 가
      // 설정된 모델(실패 스냅샷이 기록한 모델)을 우선하고, 없으면
      // 설정 화면으로 보낸다.
      const failedModel = availableModels.find(
        (model) => model.downloadError && model.repo && model.filename,
      );
      const catalogModel = failedModel ? getModelById(failedModel.id) : undefined;
      if (catalogModel) {
        void downloadLocalModel(catalogModel, { sourceRoute: pathname });
      } else {
        router.push('/local-models');
      }
    }
  };

  if (!isRendered) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 z-50 px-4"
      style={{ bottom: bottomOffset }}
    >
      {/* Mini Status Chip (visible when dismissed while downloading) */}
      <Animated.View 
        style={chipAnimatedStyle}
        className={cn(
          "absolute bottom-0 items-end",
          isLibraryScreen ? "left-4" : "right-4"
        )}
        pointerEvents={isBannerDismissed ? 'auto' : 'none'}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${activeModelName} 다운로드 상태 펼치기`}
          accessibilityValue={{ text: `${downloadProgress?.percentage ?? 0}%` }}
          onPress={() => setLocalLLMBannerDismissed(false)}
          className="min-h-11 flex-row items-center bg-app-surface border border-app-border rounded-full px-3 py-2 shadow-md active:opacity-80"
        >
          <ActivityIndicator size="small" color={appText} className="mr-2" />
          <Text className="text-[12px] font-bold text-app-text">
            {downloadProgress?.percentage ?? 0}%
          </Text>
        </Pressable>
      </Animated.View>

      {/* Main Banner */}
      <GestureDetector gesture={gesture}>
        <Animated.View 
          style={animatedStyle}
          className="rounded-2xl border border-app-border bg-app-surface shadow-xl overflow-hidden"
        >
          <Pressable 
            accessibilityRole={downloadStatus === 'downloading' ? undefined : 'button'}
            accessibilityLabel={bannerTitle}
            accessibilityHint={
              downloadStatus === 'completed'
                ? '로컬 모델 관리 화면을 엽니다'
                : downloadStatus === 'error'
                  ? '다운로드를 다시 시도합니다'
                  : undefined
            }
            accessibilityState={{ disabled: downloadStatus === 'downloading' }}
            onPress={handlePress}
            disabled={downloadStatus === 'downloading'}
            className="flex-row items-center p-4 gap-4 active:bg-app-bg"
          >
            <View className="w-10 h-10 rounded-full bg-app-border/40 items-center justify-center">
              {downloadStatus === 'downloading' ? (
                <ActivityIndicator size="small" color={appText} />
              ) : downloadStatus === 'completed' ? (
                <CheckCircle2 size={20} color={appText} />
              ) : (
                <CircleAlert size={20} color={appAccent} />
              )}
            </View>

            <View className="flex-1 overflow-hidden">
              <View className="flex-row items-center h-6">
                <MarqueeText 
                  text={bannerTitle} 
                  className="text-[15px] font-bold text-app-text" 
                />
              </View>

              {downloadStatus === 'downloading' ? (
                <View className="mt-2">
                  <Progress value={downloadProgress?.percentage ?? 0} className="h-1.5" />
                  <View className="flex-row justify-between mt-1.5">
                    <Text className="text-[11px] font-medium text-app-muted">
                      {downloadProgress?.percentage ?? 0}% · 백그라운드 다운로드
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${activeModelName} 다운로드 취소`}
                      hitSlop={12}
                      onPress={() => void cancelLocalModelDownload()}
                    >
                      <Text className="text-[11px] font-bold text-app-accent">취소</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Text className="mt-0.5 text-[13px] text-app-muted leading-tight" numberOfLines={1}>
                  {downloadStatus === 'completed'
                    ? '이제 로컬 AI와 채팅을 시작할 수 있습니다.'
                    : downloadError ?? '네트워크 연결을 확인하고 다시 시도하세요.'}
                </Text>
              )}
            </View>

            {downloadStatus === 'completed' && (
              <ChevronRight size={18} color={appSubtle} />
            )}
          </Pressable>
          
          <View className="absolute top-1.5 left-0 right-0 items-center pointer-events-none">
            <View className="w-10 h-1 rounded-full bg-app-border" />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
