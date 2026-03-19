import { Search } from 'lucide-react-native';
import { TextInput, View } from 'react-native';

type LibrarySearchInputProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function LibrarySearchInput({ value, onChangeText }: LibrarySearchInputProps) {
  return (
    <View className="px-6 pb-6">
      <View className="flex-row items-center rounded-md bg-app-border/40 px-3 py-2">
        <Search size={16} color="#9b9a97" />
        <TextInput
          className="ml-2.5 flex-1 text-sm text-app-text"
          placeholder="기록 검색..."
          placeholderTextColor="#9b9a97"
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
}
