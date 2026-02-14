import { Text, TouchableOpacity, View } from 'react-native';

type CollectTopBarProps = {
  isSaving: boolean;
  onSave: () => void;
};

export function CollectTopBar({ isSaving, onSave }: CollectTopBarProps) {
  return (
    <View className="px-8 py-4 flex-row justify-between items-center">
      <Text className="text-app-subtle font-semibold">새 메모</Text>
      <TouchableOpacity
        className={`px-6 py-2 rounded-full bg-app-text ${isSaving ? 'opacity-30' : ''}`}
        onPress={onSave}
        disabled={isSaving}
        activeOpacity={0.8}
      >
        <Text className="text-white font-bold text-sm">저장</Text>
      </TouchableOpacity>
    </View>
  );
}
