/**
 * useConversationActions Hook
 *
 * Manages conversation edit and delete state/actions for chat.
 */

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import {
  useDeleteConversationMutation,
  useUpdateConversationDetailsMutation,
} from "../mutations";

interface UseConversationActionsOptions {
  conversationId: string;
  onNavigateBack: () => void;
}

interface UseConversationActionsReturn {
  showEditModal: boolean;
  showDeleteDialog: boolean;
  handleOpenEditModal: () => void;
  handleCloseEditModal: () => void;
  handleSaveDetails: (data: {
    title: string;
    icon: string | null;
  }) => Promise<void>;
  handleRequestDelete: () => void;
  handleConfirmDelete: () => Promise<void>;
  handleCancelDelete: () => void;
}

export function useConversationActions({
  conversationId,
  onNavigateBack,
}: UseConversationActionsOptions): UseConversationActionsReturn {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { mutateAsync: deleteConversation } = useDeleteConversationMutation();
  const { mutateAsync: updateConversationDetails } =
    useUpdateConversationDetailsMutation();

  const handleOpenEditModal = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
  }, []);

  const handleSaveDetails = useCallback(
    async ({ title, icon }: { title: string; icon: string | null }) => {
      await updateConversationDetails({
        conversationId,
        title,
        icon,
      });
      setShowEditModal(false);
    },
    [conversationId, updateConversationDetails],
  );

  const handleRequestDelete = useCallback(() => {
    setShowEditModal(false);
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteConversation({ conversationId });
      setShowDeleteDialog(false);
      onNavigateBack();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "대화를 삭제하지 못했습니다.";
      Alert.alert("대화 삭제 실패", message);
    }
  }, [conversationId, deleteConversation, onNavigateBack]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);

  return {
    showEditModal,
    showDeleteDialog,
    handleOpenEditModal,
    handleCloseEditModal,
    handleSaveDetails,
    handleRequestDelete,
    handleConfirmDelete,
    handleCancelDelete,
  };
}
