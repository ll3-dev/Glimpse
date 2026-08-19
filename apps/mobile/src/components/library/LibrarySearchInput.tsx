import { Search, X } from 'lucide-react-native';
import { TextInput, View, TouchableOpacity } from 'react-native';

type LibrarySearchInputProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function LibrarySearchInput({ value, onChangeText }: LibrarySearchInputProps) {
  return (
    <View className="px-6 pb-3">
      <View className="flex-row items-center rounded-md bg-app-border/40 px-3 py-2">
        <Search size={16} color="#9b9a97" />
        <TextInput
          className="ml-2.5 flex-1 text-sm text-app-text"
          placeholder="기록 검색..."
          placeholderTextColor="#9b9a97"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            className="p-1 -mr-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color="#787774" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
