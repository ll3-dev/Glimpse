/**
 * Chat Dialog Components
 *
 * Collection of confirmation dialogs used in chat screen.
 */

import { Text } from 'react-native';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@glimpse/ui/primitives/alert-dialog';

interface BackConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function BackConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
}: BackConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Text>응답 생성 중</Text>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Text>
              AI가 응답을 생성하고 있습니다. 나가면 지금까지 생성된 내용이
              저장됩니다.
            </Text>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Text>취소</Text>
          </AlertDialogCancel>
          <AlertDialogAction onPress={onConfirm} className="bg-destructive">
            <Text>나가기</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteMessageDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteMessageDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Text>메시지 삭제</Text>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Text>이 메시지를 삭제하시겠습니까?</Text>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Text>취소</Text>
          </AlertDialogCancel>
          <AlertDialogAction onPress={onConfirm} className="bg-destructive">
            <Text>삭제</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteConversationDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteConversationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Text>대화 삭제</Text>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Text>이 대화와 포함된 메시지를 모두 삭제하시겠습니까?</Text>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Text>취소</Text>
          </AlertDialogCancel>
          <AlertDialogAction onPress={onConfirm} className="bg-destructive">
            <Text>삭제</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
