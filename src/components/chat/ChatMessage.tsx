/**
 * ChatMessage Component
 *
 * Displays a single message bubble in the chat.
 */

import { useState } from 'react';
import { Clipboard, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-react-native';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/src/ui/primitives/alert-dialog';
import { Button, Text } from '@/src/ui/primitives';
import type { Message } from '@/src/db';
import { ChatMarkdown } from './ChatMarkdown';
import { parseChatMessageContent } from './chatMessageContent';

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
  const [showReasoning, setShowReasoning] = useState(false);
  const [copied, setCopied] = useState(false);
  const parsedContent = parseChatMessageContent(message.content);

  const handleLongPress = () => {
    setDialogOpen(true);
  };

  const handleEdit = () => {
    setDialogOpen(false);
    if (onEdit) {
      onEdit(message);
    }
  };

  const handleDelete = () => {
    setActionType('delete');
  };

  const handleConfirmAction = () => {
    if (actionType === 'delete' && onDelete) {
      onDelete(message);
    }
    setActionType(null);
    setDialogOpen(false);
  };

  const handleCancelAction = () => {
    setActionType(null);
  };

  const handleCopy = () => {
    Clipboard.setString(parsedContent.answer || message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const bubbleTextClassName = isUser
    ? 'text-white text-base leading-6'
    : 'text-gray-900 text-base leading-6';
  const mutedTextClassName = isUser
    ? 'text-gray-200 text-sm leading-5'
    : 'text-gray-700 text-sm leading-5';

  return (
    <>
      <View className={`mb-3 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
        <TouchableOpacity
          onLongPress={handleLongPress}
          activeOpacity={0.8}
          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
            isUser ? 'rounded-br-md bg-black' : 'rounded-bl-md bg-gray-100'
          }`}
        >
          {!isUser && parsedContent.reasoning && (
            <View className="mb-3 rounded-xl bg-white/70 px-3 py-2">
              <TouchableOpacity
                onPress={() => setShowReasoning((prev) => !prev)}
                className="flex-row items-center justify-between"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-semibold uppercase tracking-tight text-gray-500">
                    {parsedContent.isReasoningInProgress ? '사고 중' : '사고 요약'}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-700" numberOfLines={showReasoning ? undefined : 2}>
                    {parsedContent.reasoningSummary ?? '생각을 정리하고 있습니다.'}
                  </Text>
                </View>
                {showReasoning ? (
                  <ChevronUp size={16} color="#6b7280" />
                ) : (
                  <ChevronDown size={16} color="#6b7280" />
                )}
              </TouchableOpacity>
              {showReasoning && (
                <View className="mt-2">
                  <ChatMarkdown
                    content={parsedContent.reasoning}
                    textClassName="text-gray-700 text-sm leading-5"
                    mutedTextClassName="text-gray-700 text-sm leading-5"
                  />
                </View>
              )}
            </View>
          )}

          <ChatMarkdown
            content={parsedContent.answer || message.content}
            textClassName={bubbleTextClassName}
            mutedTextClassName={mutedTextClassName}
          />

          {!isUser && (
            <View className="mt-3 flex-row items-center justify-end">
              <TouchableOpacity
                onPress={handleCopy}
                className="flex-row items-center rounded-full bg-white/80 px-2.5 py-1.5"
              >
                {copied ? (
                  <Check size={14} color="#4b5563" />
                ) : (
                  <Copy size={14} color="#4b5563" />
                )}
                <Text className="ml-1.5 text-xs font-medium text-gray-600">
                  {copied ? '복사됨' : '복사'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isEdited && (
            <Text
              className={`mt-1 text-xs ${
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
                onPress={handleEdit}
                className="w-full rounded-2xl"
              >
                <Text>수정</Text>
              </Button>
            )}
            <Button
              variant="outline"
              onPress={handleDelete}
              className="w-full rounded-2xl border-destructive/20 active:bg-destructive/10"
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

      <AlertDialog
        open={actionType === 'delete'}
        onOpenChange={(open) => !open && handleCancelAction()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Text>메시지 삭제</Text>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Text>
                이 메시지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">
                <Text>취소</Text>
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onPress={handleConfirmAction}>
                <Text>삭제</Text>
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
