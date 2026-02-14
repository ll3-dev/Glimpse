import { Search } from 'lucide-react-native';
import { TextInput, View } from 'react-native';

type LibrarySearchInputProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function LibrarySearchInput({ value, onChangeText }: LibrarySearchInputProps) {
  return (
    <View className="px-8 pb-8">
      <View className="flex-row items-center rounded-2xl bg-[#efeeea] px-4 py-3">
        <Search size={18} color="#9b9a97" />
        <TextInput
          className="ml-3 flex-1 text-base text-app-text"
          placeholder="기록 검색..."
          placeholderTextColor="#9b9a97"
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
}
