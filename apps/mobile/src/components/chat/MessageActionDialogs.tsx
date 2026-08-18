/**
 * MessageActionDialogs Component
 *
 * Action dialog for editing and deleting individual chat messages.
 */

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@glimpse/ui/primitives/alert-dialog';
import { Button, Text } from '@glimpse/ui/primitives';

interface MessageActionDialogsProps {
  dialogOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isUser: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function MessageActionDialogs({
  dialogOpen,
  onOpenChange,
  isUser,
  onEdit,
  onDelete,
}: MessageActionDialogsProps) {
  return (
    <AlertDialog open={dialogOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Text>메시지 옵션</Text>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Text>이 메시지에 대해 수행할 작업을 선택하세요.</Text>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2">
          {isUser && (
            <Button
              variant="outline"
              onPress={onEdit}
              className="w-full rounded-2xl"
            >
              <Text>수정</Text>
            </Button>
          )}
          <Button
            variant="outline"
            onPress={onDelete}
            className="border-destructive/20 active:bg-destructive/10 w-full rounded-2xl"
          >
            <Text className="text-destructive">삭제</Text>
          </Button>
          <AlertDialogCancel asChild>
            <Button variant="ghost" className="w-full rounded-2xl">
              <Text>취소</Text>
            </Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

