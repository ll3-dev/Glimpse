/**
 * ChatDetailDialogs Component
 *
 * Group of modals and dialogs used within the ChatDetailScreen.
 */

import type { Conversation, Message } from '@glimpse/shared';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';
import {
  ConversationEditModal,
  MessageEditModal,
  BackConfirmationDialog,
  DeleteMessageDialog,
  DeleteConversationDialog,
} from '@/src/components/chat';
import { ChatAISetupDialog } from '@/src/components/chat/ChatAISetupDialog';

interface ChatDetailDialogsProps {
  // AI Setup
  aiSetup: {
    showDialog: boolean;
    isChecking: boolean;
    models: LocalModel[];
    selectedModelId: string | null;
    isDownloading: boolean;
    downloadProgress: number | null;
    handleSelectModel: (modelId: string) => void;
    handleOpenSettings: () => void;
    handleBack: () => void;
  };
  // Conversation
  conversation: Conversation | null;
  conversationActions: {
    showEditModal: boolean;
    showDeleteDialog: boolean;
    handleSaveDetails: (data: { title: string; icon: string | null }) => Promise<void>;
    handleCloseEditModal: () => void;
    handleRequestDelete: () => void;
    handleCancelDelete: () => void;
    handleConfirmDelete: () => Promise<void>;
  };
  // Message
  messageActions: {
    editingMessage: Message | null;
    showDeleteDialog: boolean;
    handleSaveEdit: (messageId: string, content: string) => Promise<void>;
    handleCancelEdit: () => void;
    handleCancelDelete: () => void;
    handleConfirmDelete: () => Promise<void>;
  };
  // Navigation
  navigation: {
    showBackDialog: boolean;
    handleCancelBack: () => void;
    handleConfirmBack: () => void;
  };
}

export function ChatDetailDialogs({
  aiSetup,
  conversation,
  conversationActions,
  messageActions,
  navigation,
}: ChatDetailDialogsProps) {
  return (
    <>
      <ChatAISetupDialog
        open={aiSetup.showDialog}
        isCheckingOptions={aiSetup.isChecking}
        models={aiSetup.models}
        selectedModelId={aiSetup.selectedModelId}
        isDownloading={aiSetup.isDownloading}
        downloadProgress={aiSetup.downloadProgress}
        onSelectModel={aiSetup.handleSelectModel}
        onOpenSettings={aiSetup.handleOpenSettings}
        onBack={aiSetup.handleBack}
      />

      <ConversationEditModal
        visible={conversationActions.showEditModal}
        conversation={conversation}
        onSave={conversationActions.handleSaveDetails}
        onCancel={conversationActions.handleCloseEditModal}
        onDelete={conversationActions.handleRequestDelete}
      />

      <MessageEditModal
        visible={messageActions.editingMessage !== null}
        message={messageActions.editingMessage}
        onSave={messageActions.handleSaveEdit}
        onCancel={messageActions.handleCancelEdit}
      />

      <BackConfirmationDialog
        open={navigation.showBackDialog}
        onOpenChange={(open) => !open && navigation.handleCancelBack()}
        onConfirm={navigation.handleConfirmBack}
      />

      <DeleteMessageDialog
        open={messageActions.showDeleteDialog}
        onOpenChange={(open) => !open && messageActions.handleCancelDelete()}
        onConfirm={messageActions.handleConfirmDelete}
      />

      <DeleteConversationDialog
        open={conversationActions.showDeleteDialog}
        onOpenChange={(open) => !open && conversationActions.handleCancelDelete()}
        onConfirm={conversationActions.handleConfirmDelete}
      />
    </>
  );
}
