import { TouchableOpacity, Text } from 'react-native';

type CaptureSaveButtonProps = {
  isSaving: boolean;
  onPress: () => void;
};

export function CaptureSaveButton({ isSaving, onPress }: CaptureSaveButtonProps) {
  return (
    <TouchableOpacity
      className={`px-4 py-2 rounded-md bg-app-text ${isSaving ? 'opacity-30' : 'active:opacity-80'}`}
      onPress={onPress}
      disabled={isSaving}
      activeOpacity={0.8}
    >
      <Text className="text-white font-semibold text-sm">저장</Text>
    </TouchableOpacity>
  );
}
