import { useEffect } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { setLocalLLMBannerDismissed } from "@/src/features/settings";

type DownloadStatus = "idle" | "downloading" | "completed" | "error";

type BannerAnimationInput = {
  downloadStatus: DownloadStatus;
  downloadCompletionHandled: boolean;
  isBannerDismissed: boolean;
};

function shouldRenderContent(
  downloadStatus: DownloadStatus,
  downloadCompletionHandled: boolean,
): boolean {
  return (
    downloadStatus === "downloading" ||
    downloadStatus === "error" ||
    (downloadStatus === "completed" && !downloadCompletionHandled)
  );
}

export function useGlobalModelDownloadBannerAnimation({
  downloadStatus,
  downloadCompletionHandled,
  isBannerDismissed,
}: BannerAnimationInput) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const chipOpacity = useSharedValue(0);
  const chipScale = useSharedValue(0.8);
  const reduceMotion = useReducedMotion();
  const shouldShow = shouldRenderContent(
    downloadStatus,
    downloadCompletionHandled,
  );
  const shouldShowChip =
    shouldShow && isBannerDismissed && downloadStatus === "downloading";
  const isRendered = shouldShow || shouldShowChip;

  // 제스처는 effect보다 먼저 정의한다 — react-hooks/immutability 룰이
  // "effect에서 사용된 값을 effect 이후에 수정"하는 것을 금지하기 때문.
  const gesture = Gesture.Pan()
    .enabled(!reduceMotion)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value =
        event.translationY > 0 ? event.translationY : event.translationY * 0.5;
    })
    .onEnd((event) => {
      const shouldDismiss =
        Math.abs(event.translationX) > 100 ||
        event.translationY > 80 ||
        Math.abs(event.velocityX) > 800 ||
        event.velocityY > 800;

      if (shouldDismiss) {
        translateX.value = withTiming(event.velocityX > 0 ? 500 : -500, {
          duration: 200,
        });
        translateY.value = withTiming(
          event.velocityY > 0 ? 200 : -100,
          { duration: 200 },
          () => scheduleOnRN(setLocalLLMBannerDismissed, true),
        );
        return;
      }

      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  useEffect(() => {
    if (reduceMotion) {
      translateX.value = 0;
      translateY.value = 0;
      opacity.value = shouldShow && !isBannerDismissed ? 1 : 0;
      chipOpacity.value = shouldShowChip ? 1 : 0;
      chipScale.value = 1;
      return;
    }

    if (shouldShow && !isBannerDismissed) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
      translateX.value = withTiming(0, { duration: 300 });
      chipOpacity.value = withTiming(0, { duration: 200 });
      chipScale.value = withTiming(0.8, { duration: 200 });
      return;
    }

    if (shouldShowChip) {
      opacity.value = withTiming(0, { duration: 200 });
      chipOpacity.value = withTiming(1, { duration: 300 });
      chipScale.value = withTiming(1, { duration: 300 });
      return;
    }

    opacity.value = withTiming(0, { duration: 200 });
    chipOpacity.value = withTiming(0, { duration: 200 });
    chipScale.value = withTiming(0.8, { duration: 200 });
    translateX.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(0, { duration: 200 });
  }, [
    chipOpacity,
    chipScale,
    isBannerDismissed,
    opacity,
    reduceMotion,
    shouldShow,
    shouldShowChip,
    translateX,
    translateY,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        scale: reduceMotion
          ? 1
          : interpolate(Math.abs(translateX.value), [0, 200], [1, 0.9]),
      },
    ] as const,
    opacity: opacity.value,
  }));

  const chipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: chipOpacity.value,
    transform: [{ scale: chipScale.value }],
  }));

  return { animatedStyle, chipAnimatedStyle, gesture, isRendered };
}
