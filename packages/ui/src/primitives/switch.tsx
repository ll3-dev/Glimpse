import { cn } from '../lib/cn';
import { TouchableOpacity, Animated, View } from 'react-native';
import { useEffect, useRef } from 'react';

type SwitchProps = {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
};

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 22;
const TRACK_PADDING = 2;
const THUMB_TRANSLATE_X = TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING * 2;

function Switch({ checked = false, disabled = false, onCheckedChange, className }: SwitchProps) {
  const translateX = useRef(new Animated.Value(checked ? THUMB_TRANSLATE_X : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: checked ? THUMB_TRANSLATE_X : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [checked, translateX]);

  const handlePress = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      className={cn(disabled && 'opacity-50', className)}
      style={{
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        borderWidth: 1,
        borderColor: checked ? '#37352f' : '#edece9',
        backgroundColor: checked ? '#37352f' : '#f7f6f3',
        padding: TRACK_PADDING,
        justifyContent: 'center',
      }}
    >
      <Animated.View style={{ transform: [{ translateX }] }}>
        <View
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.06)',
          }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export { Switch };
