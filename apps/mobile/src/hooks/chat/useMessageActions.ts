/**
 * useMessageActions Hook
 *
 * Manages message edit and delete state/actions for chat.
 */

import { useState, useCallback } from 'react';
import { useUpdateMessageMutation, useDeleteMessageMutation } from '../mutations';
import type { Message } from '@glimpse/shared';

interface UseMessageActionsOptions {
  conversationId: string;
}

interface MessageActionState {
  editing: Message | null;
  deleting: Message | null;
}

interface UseMessageActionsReturn {
  editingMessage: Message | null;
  deletingMessage: Message | null;
  showDeleteDialog: boolean;
  handleEdit: (message: Message) => void;
  handleDelete: (message: Message) => void;
  handleSaveEdit: (messageId: string, content: string) => Promise<void>;
  handleCancelEdit: () => void;
  handleConfirmDelete: () => Promise<void>;
  handleCancelDelete: () => void;
}

export function useMessageActions({
  conversationId,
}: UseMessageActionsOptions): UseMessageActionsReturn {
  const [state, setState] = useState<MessageActionState>({
    editing: null,
    deleting: null,
  });

  const { mutateAsync: updateMessage } = useUpdateMessageMutation();
  const { mutateAsync: deleteMessage } = useDeleteMessageMutation();

  const handleEdit = useCallback((message: Message) => {
    setState((prev) => ({ ...prev, editing: message }));
  }, []);

  const handleDelete = useCallback((message: Message) => {
    setState((prev) => ({ ...prev, deleting: message }));
  }, []);

  const handleSaveEdit = useCallback(
    async (messageId: string, content: string) => {
      await updateMessage({
        messageId,
        content,
        conversationId,
      });
      setState((prev) => ({ ...prev, editing: null }));
    },
    [conversationId, updateMessage],
  );

  const handleConfirmDelete = useCallback(async () => {
    const messageToDelete = state.deleting;
    if (messageToDelete) {
      await deleteMessage({
        messageId: messageToDelete.id,
        conversationId,
      });
      setState((prev) => ({ ...prev, deleting: null }));
    }
  }, [conversationId, deleteMessage, state.deleting]);

  const handleCancelEdit = useCallback(() => {
    setState((prev) => ({ ...prev, editing: null }));
  }, []);

  const handleCancelDelete = useCallback(() => {
    setState((prev) => ({ ...prev, deleting: null }));
  }, []);

  return {
    editingMessage: state.editing,
    deletingMessage: state.deleting,
    showDeleteDialog: state.deleting !== null,
    handleEdit,
    handleDelete,
    handleSaveEdit,
    handleCancelEdit,
    handleConfirmDelete,
    handleCancelDelete,
  };
}
