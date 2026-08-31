import { Pressable } from 'react-native';
import { Plus } from '@glimpse/ui/icons';
import { useSemanticColor } from '@glimpse/ui';

type LibraryCaptureFabProps = {
  bottomInset: number;
  onPress: () => void;
};

export function LibraryCaptureFab({ bottomInset, onPress }: LibraryCaptureFabProps) {
  const appBg = useSemanticColor('appBg');

  return (
    <Pressable
      onPress={onPress}
      className="absolute right-6 h-14 w-14 items-center justify-center rounded-full bg-app-text shadow-lg active:opacity-90"
      style={{ bottom: bottomInset + 16 }}
      accessibilityRole="button"
      accessibilityLabel="새 지식 저장"
    >
      <Plus color={appBg} size={28} />
    </Pressable>
  );
}
