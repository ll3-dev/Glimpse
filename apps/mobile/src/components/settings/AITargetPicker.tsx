import { View, Pressable } from 'react-native';
import { Text } from '@glimpse/ui/primitives';
import type { AITargetDescriptor } from '@/src/features/ai/targets';

type AITargetPickerProps = {
  title: string;
  selectedId: string;
  inheritsDefault?: boolean;
  allowUseDefault?: boolean;
  options: AITargetDescriptor[];
  onSelect: (targetId: string | null) => void;
};

export function AITargetPicker({
  title,
  selectedId,
  inheritsDefault = false,
  allowUseDefault = false,
  options,
  onSelect,
}: AITargetPickerProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-tight text-app-muted">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {allowUseDefault ? (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${title}: 기본값 사용`}
            accessibilityState={{ checked: inheritsDefault }}
            className={`min-h-11 justify-center rounded-lg border px-3 py-1.5 active:opacity-80 ${
              inheritsDefault ? 'border-app-text bg-app-text' : 'border-transparent bg-app-bg/60'
            }`}
            onPress={() => onSelect(null)}
          >
            <Text className={`text-xs font-semibold ${inheritsDefault ? 'text-app-bg' : 'text-app-text'}`}>
              기본값 사용
            </Text>
          </Pressable>
        ) : null}
        {options.map((option) => {
          const selected = !inheritsDefault && selectedId === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityLabel={`${title}: ${option.label}`}
              accessibilityState={{ checked: selected }}
              className={`min-h-11 justify-center rounded-lg border px-3 py-1.5 active:opacity-80 ${
                selected ? 'border-app-text bg-app-text' : 'border-transparent bg-app-bg/60'
              }`}
              onPress={() => onSelect(option.id)}
            >
              <Text className={`text-xs font-semibold ${selected ? 'text-app-bg' : 'text-app-text'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
