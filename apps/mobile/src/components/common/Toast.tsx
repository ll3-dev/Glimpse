import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';
import { useToastStore } from '@/src/stores/toast.store';
import { useSemanticColor } from '@glimpse/ui';

export function Toast() {
  const { currentToast, hideToast } = useToastStore();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const mintText = useSemanticColor('tagMintText');
  const appAccent = useSemanticColor('appAccent');
  const appPrimary = useSemanticColor('appPrimary');
  const appSubtle = useSemanticColor('appSubtle');
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  useEffect(() => {
    if (currentToast) {
      opacity.value = withTiming(1, { duration: reduceMotion ? 0 : 200 });
      translateY.value = withTiming(0, { duration: reduceMotion ? 0 : 200 });

      const timer = setTimeout(() => {
        const duration = reduceMotion ? 0 : 180;
        opacity.value = withTiming(0, { duration });
        translateY.value = withTiming(-20, { duration }, (finished) => {
          if (finished) scheduleOnRN(hideToast);
        });
      }, currentToast.durationMs ?? 2500);

      return () => clearTimeout(timer);
    } else {
      opacity.value = 0;
      translateY.value = -20;
    }
  }, [currentToast, hideToast, opacity, reduceMotion, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!currentToast) return null;

  const getIcon = () => {
    switch (currentToast.type) {
      case 'success':
        return <CheckCircle2 size={16} color={mintText} />;
      case 'error':
        return <AlertCircle size={16} color={appAccent} />;
      case 'info':
      default:
        return <Info size={16} color={appPrimary} />;
    }
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          top: Math.max(insets.top + 8, 16),
          left: 20,
          right: 20,
          zIndex: 9999,
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={currentToast.message}
        accessibilityHint="알림 닫기"
        onPress={hideToast}
        className="min-h-11 flex-row items-center bg-app-text px-4 py-2.5 rounded-full shadow-lg border border-white/10 max-w-[92%] active:opacity-90"
      >
        <View className="mr-2">{getIcon()}</View>
        <Text className="text-white text-xs font-medium tracking-tight flex-shrink mr-2" numberOfLines={2}>
          {currentToast.message}
        </Text>
        <X size={13} color={appSubtle} />
      </Pressable>
    </Animated.View>
  );
}
