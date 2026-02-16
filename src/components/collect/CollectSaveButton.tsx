import { TouchableOpacity, Text } from 'react-native';

type CollectSaveButtonProps = {
  isSaving: boolean;
  onPress: () => void;
};

export function CollectSaveButton({ isSaving, onPress }: CollectSaveButtonProps) {
  return (
    <TouchableOpacity
      className={`px-4 py-2 rounded-md bg-app-primary ${isSaving ? 'opacity-30' : ''}`}
      onPress={onPress}
      disabled={isSaving}
      activeOpacity={0.8}
    >
      <Text className="text-white font-bold text-sm">저장</Text>
    </TouchableOpacity>
  );
}
