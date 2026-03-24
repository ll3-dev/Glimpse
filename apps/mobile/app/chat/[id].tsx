/**
 * Chat Detail Screen
 *
 * Individual conversation view with AI chat.
 */

import { Activity } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, SquarePen } from 'lucide-react-native';
import {
  useConversationsQuery,
  useMessagesQuery,
  useKnowledgeItemsQuery,
} from "@/src/hooks";
import {
  ChatMessage,
  ChatInput,
  ConversationEditModal,
  ContextBadge,
  MessageEditModal,
  ChatStreamingMessage,
  BackConfirmationDialog,
  DeleteMessageDialog,
  DeleteConversationDialog,
} from "@/src/components/chat";
import { ChatAISetupDialog } from "@/src/components/chat/ChatAISetupDialog";
import { useChat } from '@/src/hooks/chat/useChat';
import { useChatAISetup } from "@/src/hooks/chat/useChatAISetup";
import { useMessageActions } from "@/src/hooks/chat/useMessageActions";
import { useConversationActions } from "@/src/hooks/chat/useConversationActions";
import { useChatNavigation } from "@/src/hooks/chat/useChatNavigation";
import { isLocalLLMReady } from "@/src/features/settings";
import { ScreenHeader } from "@glimpse/ui/primitives/screen-header";

export default function ChatDetailScreen() {
  const { id, contextItem: contextItemId } = useLocalSearchParams<{ id: string; contextItem?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: conversations } = useConversationsQuery();
  const { data: messages, isLoading: isLoadingMessages } = useMessagesQuery(id);
  const { data: knowledgeItems } = useKnowledgeItemsQuery();
  const conversation = conversations?.find((item) => item.id === id) ?? null;

  const contextItem = contextItemId && knowledgeItems
    ? knowledgeItems.find((item) => item.id === contextItemId)
    : null;

  const { sendMessage, isGenerating, streamingText, error, abortAndSave } =
    useChat({
      conversationId: id,
      contextItem,
    });

  // AI Setup
  const aiSetup = useChatAISetup({
    conversationId: id,
    onNavigateBack: () => router.back(),
    onNavigateToSettings: () =>
      router.push({
        pathname: "/settings",
        params: { returnTo: `/chat/${id}` },
      }),
  });

  // Message actions
  const messageActions = useMessageActions({ conversationId: id });

  // Conversation actions
  const conversationActions = useConversationActions({
    conversationId: id,
    onNavigateBack: () => router.back(),
  });

  // Navigation & scroll
  const navigation = useChatNavigation({
    isGenerating,
    messages,
    streamingText,
    onAbortAndSave: abortAndSave,
    onNavigateBack: () => router.back(),
  });

  const handleSend = async (text: string) => {
    if (!isLocalLLMReady()) {
      const ready = await aiSetup.ensureReady();
      if (!ready) return false;
    }

    const didSend = await sendMessage(text);
    if (didSend) {
      setTimeout(() => {
        navigation.scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    return didSend;
  };

  const conversationTitle = conversation?.title?.trim() || "새 대화";
  const conversationIcon = conversation?.icon ?? null;
  const headerTitle = conversationIcon
    ? `${conversationIcon} ${conversationTitle}`
    : conversationTitle;

  return (
    <View className="bg-app-bg flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title={headerTitle}
        leftElement={
          <TouchableOpacity
            onPress={() => navigation.handleBackPress()}
            className="-ml-3 h-10 w-10 items-center justify-center"
          >
            <ChevronLeft size={24} color="#37352f" />
          </TouchableOpacity>
        }
        rightElement={
          <Activity mode={conversation ? "visible" : "hidden"}>
            <TouchableOpacity
              onPress={conversationActions.handleOpenEditModal}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
            >
              <SquarePen size={18} color="#37352f" />
            </TouchableOpacity>
          </Activity>
        }
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Context badge */}
        <Activity mode={contextItem ? "visible" : "hidden"}>
          <View className="px-4 pb-2">
            <ContextBadge item={contextItem} />
          </View>
        </Activity>

        {/* Messages */}
        <ScrollView
          ref={navigation.scrollViewRef}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 20,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Activity mode={isLoadingMessages ? "visible" : "hidden"}>
            <View className="flex-1 items-center justify-center py-8">
              <Text className="text-gray-500">로딩 중...</Text>
            </View>
          </Activity>

          <Activity
            mode={
              !isLoadingMessages && messages && messages.length > 0
                ? "visible"
                : "hidden"
            }
          >
            {messages?.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                onEdit={messageActions.handleEdit}
                onDelete={messageActions.handleDelete}
                isPending={
                  isGenerating &&
                  index === messages.length - 1 &&
                  message.role === "user"
                }
              />
            ))}
          </Activity>

          <Activity
            mode={
              !isLoadingMessages && (!messages || messages.length === 0)
                ? "visible"
                : "hidden"
            }
          >
            <View className="flex-1 items-center justify-center py-8">
              <Text className="text-center text-gray-400">
                {contextItem
                  ? "이 항목에 대해 질문해 보세요"
                  : "메시지를 입력해 대화를 시작하세요"}
              </Text>
            </View>
          </Activity>

          {/* Streaming response */}
          <Activity mode={isGenerating ? "visible" : "hidden"}>
            <ChatStreamingMessage content={streamingText} />
          </Activity>
        </ScrollView>

        {/* Error */}
        <Activity mode={error ? "visible" : "hidden"}>
          <View className="px-4 pb-2">
            <View className="rounded-2xl bg-red-50 px-3 py-2">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          </View>
        </Activity>

        {/* Input */}
        <ChatInput onSend={handleSend} isLoading={isGenerating} />

        {/* Dialogs */}
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
          onOpenChange={(open) =>
            !open && conversationActions.handleCancelDelete()
          }
          onConfirm={conversationActions.handleConfirmDelete}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
