import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { cn } from '@/src/lib/utils';

type MarqueeTextProps = {
  text: string;
  className?: string;
};

export function MarqueeText({ text, className }: MarqueeTextProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (containerWidth > 0 && textWidth > containerWidth) {
      const distance = textWidth - containerWidth + 20;
      translateX.value = 0;
      translateX.value = withRepeat(
        withTiming(-distance, {
          duration: distance * 50,
          easing: Easing.linear,
        }),
        -1,
        true
      );
    } else {
      cancelAnimation(translateX);
      translateX.value = 0;
    }
  }, [containerWidth, text, textWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      className="overflow-hidden flex-1 mr-2"
      onLayout={(e) => {
        setContainerWidth(e.nativeEvent.layout.width);
      }}
    >
      <Animated.View style={animatedStyle} className="flex-row">
        <Text
          className={cn('whitespace-nowrap', className)}
          onLayout={(e) => {
            setTextWidth(e.nativeEvent.layout.width);
          }}
          numberOfLines={1}
        >
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}
