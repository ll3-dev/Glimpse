/**
 * ChatMessage Component
 *
 * Displays a single message bubble in the chat.
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/ui/primitives/alert-dialog';
import type { Message } from '@/src/db';

interface ChatMessageProps {
  message: Message;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
}

export function ChatMessage({ message, onEdit, onDelete }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isEdited = message.updatedAt !== null;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'edit' | 'delete' | null>(null);

  const handleLongPress = () => {
    setDialogOpen(true);
  };

  const handleEdit = () => {
    setActionType('edit');
  };

  const handleDelete = () => {
    setActionType('delete');
  };

  const handleConfirm = () => {
    if (actionType === 'edit' && onEdit) {
      onEdit(message);
    } else if (actionType === 'delete' && onDelete) {
      onDelete(message);
    }
    setActionType(null);
    setDialogOpen(false);
  };

  const handleCancel = () => {
    setActionType(null);
    setDialogOpen(false);
  };

  return (
    <>
      <View className={`flex-row mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <TouchableOpacity
          onLongPress={handleLongPress}
          activeOpacity={0.8}
          className={`max-w-[85%] px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-black rounded-br-md'
              : 'bg-gray-100 rounded-bl-md'
          }`}
        >
          <Text
            className={`text-base leading-5 ${
              isUser ? 'text-white' : 'text-gray-900'
            }`}
          >
            {message.content}
          </Text>
          {isEdited && (
            <Text
              className={`text-xs mt-1 ${
                isUser ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              (수정됨)
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>메시지 옵션</AlertDialogTitle>
            <AlertDialogDescription>
              이 메시지에 대해 수행할 작업을 선택하세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            {isUser && (
              <AlertDialogAction onPress={handleEdit} className="w-full">
                수정
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onPress={handleDelete}
              className="w-full bg-destructive"
            >
              삭제
            </AlertDialogAction>
            <AlertDialogCancel onPress={handleCancel} className="w-full">
              취소
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 확인 다이얼로그 */}
      <AlertDialog open={actionType !== null} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'edit' ? '메시지 수정' : '메시지 삭제'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'edit'
                ? '이 메시지를 수정하시겠습니까?'
                : '이 메시지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={handleCancel}>취소</AlertDialogCancel>
            <AlertDialogAction onPress={handleConfirm}>
              {actionType === 'edit' ? '수정' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
