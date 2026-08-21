import { Pressable, View } from 'react-native';
import { Text } from '@glimpse/ui/primitives';
import { type BYOKProviderType } from '@/src/features/settings';

type BYOKProviderPickerProps = {
  providers: readonly BYOKProviderType[];
  selectedProvider: BYOKProviderType | null;
  onSelect: (provider: BYOKProviderType) => void | Promise<void>;
};

export function BYOKProviderPicker({
  providers,
  selectedProvider,
  onSelect,
}: BYOKProviderPickerProps) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-app-muted mb-2 uppercase tracking-tight">
        Provider
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {providers.map((provider) => (
          <Pressable
            key={provider}
            accessibilityRole="radio"
            accessibilityLabel={`${provider} Provider`}
            accessibilityState={{ checked: selectedProvider === provider }}
            className={`min-h-11 justify-center px-3 py-1.5 rounded-md border active:opacity-80 ${
              selectedProvider === provider
                ? 'bg-app-text border-app-text'
                : 'bg-app-surface border-app-border'
            }`}
            onPress={() => onSelect(provider)}
          >
            <Text
              className={`text-xs font-semibold uppercase ${
                selectedProvider === provider ? 'text-white' : 'text-app-text'
              }`}
            >
              {provider}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
