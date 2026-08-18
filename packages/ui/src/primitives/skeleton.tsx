/**
 * Skeleton Component
 *
 * A loading placeholder with shimmer animation.
 * Uses Platform.select() for web/native implementations.
 */

import { cn } from '../lib/cn';
import { Platform, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
}

export function Skeleton({ width, height, radius = 4, className }: SkeletonProps) {
  // Build style object
  const style: ViewStyle = {
    borderRadius: radius,
    ...(typeof width === 'number' ? { width } : { width: width as any }),
    ...(typeof height === 'number' ? { height } : { height: height as any }),
  };

  return (
    <SkeletonInner
      style={style}
      className={cn('bg-app-border overflow-hidden', className)}
    />
  );
}

function SkeletonInner({
  style,
  className,
}: {
  style: ViewStyle;
  className?: string;
}) {
  if (Platform.OS === 'web') {
    return (
      <View
        style={style}
        className={cn(className, 'animate-pulse')}
      />
    );
  }

  return <NativeSkeleton style={style} className={className} />;
}

function NativeSkeleton({
  style,
  className,
}: {
  style: ViewStyle;
  className?: string;
}) {
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(1, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false
    );
  }, [shimmerPosition]);

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: shimmerPosition.value * 200 },
      ],
    };
  });

  return (
    <View style={style} className={cn(className, 'relative overflow-hidden')}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: -100,
            width: 100,
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
          },
          shimmerStyle,
        ]}
      />
    </View>
  );
}
