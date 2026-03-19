import { cn } from '../lib/cn';
import { TouchableOpacity, Animated, View } from 'react-native';
import { useEffect, useRef } from 'react';

type SwitchProps = {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
};

function Switch({ checked = false, disabled = false, onCheckedChange, className }: SwitchProps) {
  const translateX = useRef(new Animated.Value(checked ? 14 : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: checked ? 14 : 0,
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
      className={cn(
        'w-11 h-6 rounded-full p-1 justify-center',
        checked ? 'bg-primary' : 'bg-[#d9dde3]',
        disabled && 'opacity-50',
        className
      )}
    >
      <Animated.View
        style={{ transform: [{ translateX }] }}
      >
        <View className="w-4 h-4 rounded-full bg-white" />
      </Animated.View>
    </TouchableOpacity>
  );
}

export { Switch };
