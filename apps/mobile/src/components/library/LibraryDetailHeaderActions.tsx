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
        className="p-2 active:opacity-70"
        accessibilityLabel="복사"
      >
        <Copy size={18} color={appMuted} />
      </Pressable>
      <Pressable
        onPress={onEdit}
        className="p-2 active:opacity-70"
        accessibilityLabel="수정"
      >
        <Pencil size={18} color={appMuted} />
      </Pressable>
      <Pressable
        onPress={onDelete}
        disabled={isDeleting}
        className="p-2 -mr-2 active:opacity-70"
        accessibilityLabel="삭제"
      >
        <Trash2 size={18} color={appAccent} />
      </Pressable>
    </View>
  );
}
