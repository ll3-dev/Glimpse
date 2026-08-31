import { Pressable } from 'react-native';
import { Settings } from 'lucide-react-native';
import { ScreenHeader, useSemanticColor } from '@glimpse/ui';

type LibraryScreenHeaderProps = {
  itemCount: number;
  onOpenSettings: () => void;
};

export function LibraryScreenHeader({ itemCount, onOpenSettings }: LibraryScreenHeaderProps) {
  const appText = useSemanticColor('appText');

  return (
    <ScreenHeader
      title="보관함"
      subtitle={itemCount > 0 ? `${itemCount}개의 지식` : undefined}
      rightElement={
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full active:bg-app-border/40"
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel="설정"
        >
          <Settings size={20} color={appText} />
        </Pressable>
      }
    />
  );
}
