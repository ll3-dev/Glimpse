import { Pressable, Text } from 'react-native';

type CaptureSaveButtonProps = {
  isSaving: boolean;
  onPress: () => void;
};

export function CaptureSaveButton({ isSaving, onPress }: CaptureSaveButtonProps) {
  return (
    <Pressable
      className={`h-9 px-4 rounded-full bg-app-text items-center justify-center ${isSaving ? 'opacity-40' : 'active:opacity-80'}`}
      onPress={onPress}
      disabled={isSaving}
      accessibilityRole="button"
      accessibilityLabel="저장"
    >
      <Text className="text-app-bg font-semibold text-xs">
        {isSaving ? '저장 중...' : '저장'}
      </Text>
    </Pressable>
  );
}

