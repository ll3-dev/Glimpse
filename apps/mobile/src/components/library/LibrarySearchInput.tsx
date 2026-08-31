import { Search, X } from 'lucide-react-native';
import { TextInput, View, Pressable } from 'react-native';
import { useSemanticColor } from '@glimpse/ui';

type LibrarySearchInputProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function LibrarySearchInput({ value, onChangeText }: LibrarySearchInputProps) {
  const appSubtle = useSemanticColor('appSubtle');
  const appMuted = useSemanticColor('appMuted');

  return (
    <View className="px-6 pb-2.5">
      <View className="h-11 flex-row items-center rounded-xl border border-app-border bg-app-surface px-3.5">
        <Search size={16} color={appSubtle} />
        <TextInput
          className="ml-2.5 flex-1 text-sm text-app-text py-0"
          placeholder="기록 검색..."
          placeholderTextColor={appSubtle}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText('')}
            className="p-1 -mr-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="검색어 지우기"
          >
            <X size={14} color={appMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
