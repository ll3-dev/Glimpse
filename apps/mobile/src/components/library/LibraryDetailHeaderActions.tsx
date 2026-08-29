import { View, Pressable } from 'react-native';
import { Copy, Pencil, Trash2 } from 'lucide-react-native';
import { useSemanticColor } from '@glimpse/ui';

interface LibraryDetailHeaderActionsProps {
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function LibraryDetailHeaderActions({
  onCopy,
  onEdit,
  onDelete,
  isDeleting = false,
}: LibraryDetailHeaderActionsProps) {
  const appMuted = useSemanticColor('appMuted');
  const appAccent = useSemanticColor('appAccent');

  return (
    <View className="flex-row items-center gap-1">
      <Pressable
        onPress={onCopy}
        className="h-9 w-9 items-center justify-center rounded-lg active:bg-app-border/40"
        accessibilityLabel="복사"
      >
        <Copy size={17} color={appMuted} />
      </Pressable>
      <Pressable
        onPress={onEdit}
        className="h-9 w-9 items-center justify-center rounded-lg active:bg-app-border/40"
        accessibilityLabel="수정"
      >
        <Pencil size={17} color={appMuted} />
      </Pressable>
      <Pressable
        onPress={onDelete}
        disabled={isDeleting}
        className="h-9 w-9 items-center justify-center rounded-lg active:bg-app-accent/10"
        accessibilityLabel="삭제"
      >
        <Trash2 size={17} color={appAccent} />
      </Pressable>
    </View>
  );
}
