import { Pressable, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Text } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';

type ReminderTimeStepperProps = {
  label: string;
  value: number;
  unit: string;
  minValue: number;
  maxValue: number;
  onChange: (next: number) => void;
};

/** 시간·분 스테퍼 행 — minus/plus가 값을 감싸는 최소 선택 UI. */
export function ReminderTimeStepper({
  label,
  value,
  unit,
  minValue,
  maxValue,
  onChange,
}: ReminderTimeStepperProps) {
  const appText = useSemanticColor('appText');
  const appMuted = useSemanticColor('appMuted');
  const appAccent = useSemanticColor('appAccent');

  const clamp = (next: number) => Math.min(maxValue, Math.max(minValue, next));

  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-sm text-app-muted">{label}</Text>
      <View className="flex-row items-center gap-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 감소`}
          onPress={() => onChange(clamp(value - 1))}
          disabled={value <= minValue}
          className="min-h-11 min-w-11 items-center justify-center rounded-lg active:opacity-70"
        >
          <Minus size={18} color={value <= minValue ? appMuted : appText} />
        </Pressable>
        <Text
          accessibilityRole="text"
          accessibilityLabel={`${label} ${value}${unit}`}
          className="min-w-14 text-center text-base font-semibold text-app-text"
        >
          {String(value).padStart(2, '0')}
          {unit}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 증가`}
          onPress={() => onChange(clamp(value + 1))}
          disabled={value >= maxValue}
          className="min-h-11 min-w-11 items-center justify-center rounded-lg active:opacity-70"
        >
          <Plus size={18} color={value >= maxValue ? appMuted : appText} />
        </Pressable>
      </View>
    </View>
  );
}
