/**
 * ChatMessage Component
 *
 * Displays a single message bubble in the chat.
 */

import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@glimpse/ui/primitives';
import type { Message } from '@glimpse/shared';
import { ChatMarkdown } from './ChatMarkdown';
import { ChatMessageReasoning } from './ChatMessageReasoning';
import { ChatMessageActions } from './ChatMessageActions';
import { MessageActionDialogs } from './MessageActionDialogs';
import { parseChatMessageContent } from '@/src/features/chat';

interface ChatMessageProps {
  message: Message;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
}

function ChatMessageImpl({ message, onEdit, onDelete }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isEdited = message.updatedAt !== null;
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const handleDeleteRequest = () => {
    setDialogOpen(false);
    if (onDelete) {
      onDelete(message);
    }
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
        className={`mb-3 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <Pressable
          onLongPress={handleLongPress}
          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
            isUser
              ? 'rounded-br-md bg-app-text'
              : 'rounded-bl-md bg-app-surface border border-app-border shadow-xs'
          }`}
        >
          {!isUser && <ChatMessageReasoning parsedContent={parsedContent} />}

          <ChatMarkdown
            content={parsedContent.answer || message.content}
            textClassName={bubbleTextClassName}
            mutedTextClassName={mutedTextClassName}
          />

          {!isUser && (
            <ChatMessageActions content={parsedContent.answer || message.content} />
          )}

          {isEdited && (
            <Text
              className={`mt-1 text-xs ${
                isUser ? 'text-white/60' : 'text-app-subtle'
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

/**
 * Memoized so a streaming token cannot re-render every past message: each
 * ChatMessage re-parses markdown on render, so token-frequency re-renders of
 * the whole list bottleneck generation speed on long conversations.
 */
export const ChatMessage = memo(
  ChatMessageImpl,
  (prev, next) =>
    prev.message === next.message &&
    prev.onEdit === next.onEdit &&
    prev.onDelete === next.onDelete,
);
