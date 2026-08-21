/**
 * ChatMessage Component
 *
 * Displays a single message bubble in the chat.
 */

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, ChevronDown, ChevronUp, Copy, BookmarkPlus, BookmarkCheck } from 'lucide-react-native';
import { Text } from '@glimpse/ui/primitives';
import type { Message } from '@glimpse/shared';
import { ChatMarkdown } from './ChatMarkdown';
import { MessageActionDialogs } from './MessageActionDialogs';
import { parseChatMessageContent } from '@/src/features/chat';
import { useSaveKnowledgeItemMutation } from '@/src/hooks';
import { toast } from '@/src/stores/toast.store';

interface ChatMessageProps {
  message: Message;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  isPending?: boolean;
}

export function ChatMessage({ message, onEdit, onDelete, isPending }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isEdited = message.updatedAt !== null;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const { mutate: saveItem, isPending: isSaving } = useSaveKnowledgeItemMutation();
  const parsedContent = parseChatMessageContent(message.content);

  const handleSaveToKnowledge = () => {
    if (isSaving || saved) return;
    const content = parsedContent.answer || message.content;
    const firstLine = content
      .split('\n')[0]
      .replace(/^[#*-\s]+/, '')
      .trim()
      .slice(0, 40);

    saveItem(
      {
        type: 'note',
        title: firstLine || 'AI 답변 요약',
        body: content,
        tags: ['AI대화'],
      },
      {
        onSuccess: () => {
          setSaved(true);
          toast.success('보관함에 새 메모로 저장되었습니다');
        },
        onError: (error) => {
          toast.error(`저장 실패: ${error.message}`);
        },
      }
    );
  };

  const handleLongPress = () => {
    setDialogOpen(true);
  };

  const handleEdit = () => {
    setDialogOpen(false);
    if (onEdit) {
      onEdit(message);
    }
  };

  const handleDeleteRequest = () => {
    setDialogOpen(false);
    if (onDelete) {
      onDelete(message);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(parsedContent.answer || message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const bubbleTextClassName = isUser
    ? 'text-white text-base leading-6'
    : 'text-app-text text-base leading-6';
  const mutedTextClassName = isUser
    ? 'text-white/80 text-sm leading-5'
    : 'text-app-muted text-sm leading-5';

  return (
    <>
      <View
        className={`mb-3 flex-row ${isUser ? "justify-end" : "justify-start"}`}
      >
        <Pressable
          onLongPress={handleLongPress}
          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
            isUser
              ? "rounded-br-md bg-app-text"
              : "rounded-bl-md bg-app-surface border border-app-border shadow-xs"
          }`}
        >
          {!isUser && parsedContent.reasoning && (
            <View className="mb-3 rounded-md bg-app-bg border border-app-border px-3 py-2">
              <Pressable
                onPress={() => setShowReasoning((prev) => !prev)}
                className="flex-row items-center justify-between"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-semibold tracking-tight text-app-muted uppercase">
                    {parsedContent.isReasoningInProgress
                      ? "사고 중"
                      : "사고 요약"}
                  </Text>
                  <Text
                    className="mt-1 text-sm text-app-text"
                    numberOfLines={showReasoning ? undefined : 2}
                  >
                    {parsedContent.reasoningSummary ??
                      "생각을 정리하고 있습니다."}
                  </Text>
                </View>
                {showReasoning ? (
                  <ChevronUp size={16} color="#787774" />
                ) : (
                  <ChevronDown size={16} color="#787774" />
                )}
              </Pressable>
              {showReasoning && (
                <View className="mt-2 pt-2 border-t border-app-border">
                  <ChatMarkdown
                    content={parsedContent.reasoning}
                    textClassName="text-app-text text-sm leading-5"
                    mutedTextClassName="text-app-muted text-sm leading-5"
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
            <View className="mt-3 flex-row items-center justify-end gap-2">
              <Pressable
                onPress={handleSaveToKnowledge}
                disabled={isSaving}
                className="flex-row items-center rounded-md bg-app-bg border border-app-border px-2.5 py-1"
              >
                {saved ? (
                  <BookmarkCheck size={13} color="#1a7f37" />
                ) : (
                  <BookmarkPlus size={13} color="#787774" />
                )}
                <Text
                  className={`ml-1.5 text-xs font-medium ${
                    saved ? 'text-tag-mint-text' : 'text-app-muted'
                  }`}
                >
                  {saved ? "저장됨" : isSaving ? "저장 중..." : "보관함에 저장"}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleCopy}
                className="flex-row items-center rounded-md bg-app-bg border border-app-border px-2.5 py-1"
              >
                {copied ? (
                  <Check size={13} color="#1a7f37" />
                ) : (
                  <Copy size={13} color="#787774" />
                )}
                <Text className="ml-1.5 text-xs font-medium text-app-muted">
                  {copied ? "복사됨" : "복사"}
                </Text>
              </Pressable>
            </View>
          )}

          {isEdited && (
            <Text
              className={`mt-1 text-xs ${
                isUser ? "text-white/60" : "text-app-subtle"
              }`}
            >
              (수정됨)
            </Text>
          )}
        </Pressable>
      </View>

      <MessageActionDialogs
        dialogOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        isUser={isUser}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
      />
    </>
  );
}
