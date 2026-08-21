import { Pressable, Text } from 'react-native';

type CaptureSaveButtonProps = {
  isSaving: boolean;
  onPress: () => void;
};

export function CaptureSaveButton({ isSaving, onPress }: CaptureSaveButtonProps) {
  return (
    <Pressable
      className={`px-4 py-2 rounded-md bg-app-text ${isSaving ? 'opacity-30' : 'active:opacity-80'}`}
      onPress={onPress}
      disabled={isSaving}
    >
      <Text className="text-white font-semibold text-sm">저장</Text>
    </Pressable>
  );
}
