import { useMemo, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { ActivityIndicator, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, CircleAlert, ChevronRight } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Progress } from '@glimpse/ui/primitives/progress';
import {
  cancelLocalModelDownload,
  downloadLocalModel,
  markDownloadCompletionHandled,
  useLocalLLMConfig,
  setLocalLLMBannerDismissed,
} from '@/src/features/settings';
import { cn } from '@/src/lib/utils';
import { MarqueeText } from '@/src/components/common/MarqueeText';

export function GlobalModelDownloadBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
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

  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  
  // Mini status chip animation
  const chipOpacity = useSharedValue(0);
  const chipScale = useSharedValue(0.8);
  const [isRendered, setIsRendered] = useState(() =>
    shouldRenderContent(downloadStatus, downloadCompletionHandled)
  );

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

  const shouldShow =
    (downloadStatus === 'downloading' ||
    downloadStatus === 'error' ||
    (downloadStatus === 'completed' && !downloadCompletionHandled));

  const shouldShowChip = shouldShow && isBannerDismissed && downloadStatus === 'downloading';

  const isTabScreen = useMemo(() => {
    const tabRoutes = ['/library', '/chat', '/review', '/digest', '/'];
    return tabRoutes.includes(pathname);
  }, [pathname]);

  const isLibraryScreen = pathname === '/library' || pathname === '/';

  // Position it above the FAB (which is at +16-20)
  const bottomOffset = isTabScreen ? insets.bottom + 85 : insets.bottom + 20;

  // Banner animations
  useEffect(() => {
    if (shouldShow || shouldShowChip) {
      setIsRendered(true);
    }

    if (shouldShow && !isBannerDismissed) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
      translateX.value = withTiming(0, { duration: 300 });
      
      // Hide chip
      chipOpacity.value = withTiming(0, { duration: 200 });
      chipScale.value = withTiming(0.8, { duration: 200 });
    } else if (shouldShow && isBannerDismissed && downloadStatus === 'downloading') {
      // Show mini chip
      opacity.value = withTiming(0, { duration: 200 });
      chipOpacity.value = withTiming(1, { duration: 300 });
      chipScale.value = withTiming(1, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      chipOpacity.value = withTiming(0, { duration: 200 });
      chipScale.value = withTiming(0.8, { duration: 200 });
      translateX.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(setIsRendered)(false);
        }
      });
    }
  }, [
    chipOpacity,
    chipScale,
    downloadStatus,
    isBannerDismissed,
    opacity,
    shouldShow,
    shouldShowChip,
    translateX,
    translateY,
  ]);

  // Reset dismissal when status changes to something new
  useEffect(() => {
    if (downloadStatus === 'completed' || downloadStatus === 'error') {
      setLocalLLMBannerDismissed(false);
    }
  }, [downloadStatus]);

  const handlePress = () => {
    if (downloadStatus === 'completed') {
      markDownloadCompletionHandled();
      router.push('/settings');
    } else if (downloadStatus === 'error') {
      // 실패한 모델을 찾아 재다운로드 — per-model downloadError 가
      // 설정된 모델(실패 스냅샷이 기록한 모델)을 우선하고, 없으면
      // 설정 화면으로 보낸다.
      const failedModel = availableModels.find(
        (model) => model.downloadError && model.repo && model.filename,
      );
      if (failedModel) {
        void downloadLocalModel(
          {
            id: failedModel.id,
            name: failedModel.name,
            repo: failedModel.repo!,
            filename: failedModel.filename!,
            family: failedModel.family,
          },
          { sourceRoute: pathname },
        );
      } else {
        router.push('/settings');
      }
    }
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY > 0 ? event.translationY : event.translationY * 0.5;
    })
    .onEnd((event) => {
      const shouldDismiss = 
        Math.abs(event.translationX) > 100 || 
        event.translationY > 80 || 
        Math.abs(event.velocityX) > 800 || 
        event.velocityY > 800;

      if (shouldDismiss) {
        // Flick away
        const destX = event.velocityX > 0 ? 500 : -500;
        const destY = event.velocityY > 0 ? 200 : -100;
        
        translateX.value = withTiming(destX, { duration: 200 });
        translateY.value = withTiming(destY, { duration: 200 }, () => {
          runOnJS(setLocalLLMBannerDismissed)(true);
        });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const scale = interpolate(Math.abs(translateX.value), [0, 200], [1, 0.9]);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale },
      ] as const,
      opacity: opacity.value,
    };
  });

  const chipAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: chipOpacity.value,
      transform: [{ scale: chipScale.value }],
    };
  });

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
        <TouchableOpacity 
          onPress={() => setLocalLLMBannerDismissed(false)}
          activeOpacity={0.8}
          className="flex-row items-center bg-app-surface border border-app-border rounded-full px-3 py-2 shadow-md"
        >
          <ActivityIndicator size="small" color="#37352f" className="mr-2" />
          <Text className="text-[12px] font-bold text-app-text">
            {downloadProgress?.percentage ?? 0}%
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Main Banner */}
      <GestureDetector gesture={gesture}>
        <Animated.View 
          style={animatedStyle}
          className="rounded-2xl border border-app-border bg-app-surface shadow-xl overflow-hidden"
        >
          <Pressable 
            onPress={handlePress}
            className="flex-row items-center p-4 gap-4 active:bg-app-bg"
          >
            <View className="w-10 h-10 rounded-full bg-app-border/40 items-center justify-center">
              {downloadStatus === 'downloading' ? (
                <ActivityIndicator size="small" color="#37352f" />
              ) : downloadStatus === 'completed' ? (
                <CheckCircle2 size={20} color="#37352f" />
              ) : (
                <CircleAlert size={20} color="#eb5757" />
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
                      {downloadProgress?.percentage ?? 0}% 완료
                    </Text>
                    <TouchableOpacity onPress={async () => await cancelLocalModelDownload()}>
                      <Text className="text-[11px] font-bold text-app-accent">취소</Text>
                    </TouchableOpacity>
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
              <ChevronRight size={18} color="#9b9a97" />
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

function shouldRenderContent(
  downloadStatus: 'idle' | 'downloading' | 'completed' | 'error',
  downloadCompletionHandled: boolean,
) {
  return (
    downloadStatus === 'downloading' ||
    downloadStatus === 'error' ||
    (downloadStatus === 'completed' && !downloadCompletionHandled)
  );
}
