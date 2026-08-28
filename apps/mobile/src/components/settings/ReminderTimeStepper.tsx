import { Pressable, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Text } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { useAppLocale } from '@/src/localization';

type ReminderTimeStepperProps = {
  label: string;
  value: number;
  minValue: number;
  maxValue: number;
  onChange: (next: number) => void;
};

/** 시간·분 스테퍼 행 — minus/plus가 값을 감싸는 최소 선택 UI. */
export function ReminderTimeStepper({
  label,
  value,
  minValue,
  maxValue,
  onChange,
}: ReminderTimeStepperProps) {
  const { messages } = useAppLocale();
  const appText = useSemanticColor('appText');
  const appMuted = useSemanticColor('appMuted');

  const clamp = (next: number) => Math.min(maxValue, Math.max(minValue, next));

  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-sm text-app-muted">{label}</Text>
      <View className="flex-row items-center gap-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} ${messages.settings.reviewReminderDecrease}`}
          onPress={() => onChange(clamp(value - 1))}
          disabled={value <= minValue}
          className="min-h-11 min-w-11 items-center justify-center rounded-lg active:opacity-70"
        >
          <Minus size={18} color={value <= minValue ? appMuted : appText} />
        </Pressable>
        <Text
          accessibilityRole="text"
          accessibilityLabel={`${label} ${value}`}
          className="min-w-14 text-center text-base font-semibold text-app-text"
        >
          {String(value).padStart(2, '0')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} ${messages.settings.reviewReminderIncrease}`}
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
