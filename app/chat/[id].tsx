/**
 * Chat Detail Screen
 *
 * Individual conversation view with AI chat.
 */

import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, BackHandler, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, SquarePen } from 'lucide-react-native';
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  useConversationsQuery,
  useDeleteConversationMutation,
  useMessagesQuery,
  useKnowledgeItemsQuery,
  useUpdateConversationDetailsMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
} from '@/src/hooks';
import {
  ChatMessage,
  ChatInput,
  ConversationEditModal,
  ContextBadge,
  MessageEditModal,
  ChatStreamingMessage,
} from '@/src/components/chat';
import { ChatAISetupDialog } from "@/src/components/chat/ChatAISetupDialog";
import { useChat } from '@/src/hooks/chat/useChat';
import {
  enableLocalLLM,
  isLocalLLMReady,
  selectLocalLLMModel,
  syncRecommendedLocalModels,
  useAvailableLocalModels,
  useSelectedLocalModelId,
} from "@/src/features/settings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/ui/primitives/alert-dialog";
import { ScreenHeader } from '@/src/ui/primitives/screen-header';
import type { Message } from '@/src/db';

export default function ChatDetailScreen() {
  const { id, contextItem: contextItemId } = useLocalSearchParams<{ id: string; contextItem?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const { data: conversations } = useConversationsQuery();
  const { data: messages, isLoading: isLoadingMessages } = useMessagesQuery(id);
  const { data: knowledgeItems } = useKnowledgeItemsQuery();
  const conversation = conversations?.find((item) => item.id === id) ?? null;

  // Find context item if provided
  const contextItem = contextItemId && knowledgeItems
    ? knowledgeItems.find((item) => item.id === contextItemId)
    : null;

  const { sendMessage, isGenerating, streamingText, error, abortAndSave } =
    useChat({
      conversationId: id,
      contextItem,
    });

  // Edit/Delete state
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [showDeleteConversationDialog, setShowDeleteConversationDialog] = useState(false);
  const [showBackDialog, setShowBackDialog] = useState(false);
  const [showConversationEditModal, setShowConversationEditModal] = useState(false);
  const [showAISetupDialog, setShowAISetupDialog] = useState(false);
  const [isCheckingAIOptions, setIsCheckingAIOptions] = useState(true);

  const selectedLocalModelId = useSelectedLocalModelId();
  const availableLocalModels = useAvailableLocalModels();

  const ensureChatAIReady = useCallback(async () => {
    if (isLocalLLMReady()) {
      setShowAISetupDialog(false);
      return true;
    }

    const syncedModels = await syncRecommendedLocalModels();
    const selectedModel = selectedLocalModelId
      ? syncedModels.find(
          (model) => model.id === selectedLocalModelId && model.isReady,
        )
      : null;

    if (selectedModel) {
      const result = enableLocalLLM();
      if (result.success) {
        setShowAISetupDialog(false);
        return true;
      }
    }

    const readyModels = syncedModels.filter((model) => model.isReady);
    if (readyModels.length === 1) {
      selectLocalLLMModel(readyModels[0].id);
      const result = enableLocalLLM();
      if (result.success) {
        setShowAISetupDialog(false);
        return true;
      }
    }

    setShowAISetupDialog(true);
    return false;
  }, [selectedLocalModelId]);

  // Mutations
  const { mutateAsync: deleteConversation } = useDeleteConversationMutation();
  const { mutateAsync: updateConversationDetails } = useUpdateConversationDetailsMutation();
  const { mutate: updateMessage } = useUpdateMessageMutation();
  const { mutate: deleteMessage } = useDeleteMessageMutation();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    const initializeAIOptions = async () => {
      setIsCheckingAIOptions(true);
      try {
        const ready = await ensureChatAIReady();
        if (!cancelled) {
          setShowAISetupDialog(!ready);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingAIOptions(false);
        }
      }
    };

    void initializeAIOptions();

    return () => {
      cancelled = true;
    };
  }, [ensureChatAIReady]);

  // Scroll to bottom when streaming text updates
  useEffect(() => {
    if (streamingText) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [streamingText]);

  // Handle back press during generation
  const handleBackPress = useCallback(() => {
    if (isGenerating) {
      setShowBackDialog(true);
      return true; // Prevent default back behavior
    }
    router.back();
    return true;
  }, [isGenerating, router]);

  const handleConfirmBack = async () => {
    await abortAndSave();
    router.back();
  };

  // Intercept hardware back button on Android
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isGenerating) {
        handleBackPress();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [isGenerating, handleBackPress]);

  const handleSend = async (text: string) => {
    if (!isLocalLLMReady()) {
      setIsCheckingAIOptions(true);
      try {
        const ready = await ensureChatAIReady();
        if (!ready) {
          return false;
        }
      } finally {
        setIsCheckingAIOptions(false);
      }
    }

    const didSend = await sendMessage(text);
    // Scroll to bottom after sending
    if (didSend) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    return didSend;
  };

  const handleSelectChatModel = async (modelId: string) => {
    selectLocalLLMModel(modelId);
    const result = enableLocalLLM();
    if (result.success) {
      setShowAISetupDialog(false);
    }
  };

  const handleOpenSettings = () => {
    setShowAISetupDialog(false);
    router.push("/settings");
  };

  // Handlers for edit/delete
  const handleEdit = (message: Message) => {
    setEditingMessage(message);
  };

  const handleDelete = (message: Message) => {
    setMessageToDelete(message);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (messageToDelete) {
      await deleteMessage({
        messageId: messageToDelete.id,
        conversationId: id,
      });
      setShowDeleteDialog(false);
      setMessageToDelete(null);
    }
  };

  const handleSaveEdit = async (messageId: string, content: string) => {
    await updateMessage({
      messageId,
      content,
      conversationId: id,
    });
    setEditingMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleSaveConversationDetails = async ({
    title,
    icon,
  }: {
    title: string;
    icon: string | null;
  }) => {
    await updateConversationDetails({
      conversationId: id,
      title,
      icon,
    });
    setShowConversationEditModal(false);
  };

  const handleRequestDeleteConversation = () => {
    setShowConversationEditModal(false);
    setShowDeleteConversationDialog(true);
  };

  const handleConfirmDeleteConversation = async () => {
    try {
      await deleteConversation({ conversationId: id });
      setShowDeleteConversationDialog(false);
      router.back();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : '대화를 삭제하지 못했습니다.';
      Alert.alert('대화 삭제 실패', message);
    }
  };

  const conversationTitle = conversation?.title?.trim() || '새 대화';
  const conversationIcon = conversation?.icon ?? null;
  const headerTitle = conversationIcon
    ? `${conversationIcon} ${conversationTitle}`
    : conversationTitle;

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title={headerTitle}
        leftElement={
          <TouchableOpacity
            onPress={handleBackPress}
            className="h-10 w-10 items-center justify-center -ml-3"
          >
            <ChevronLeft size={24} color="#37352f" />
          </TouchableOpacity>
        }
        rightElement={
          conversation ? (
            <TouchableOpacity
              onPress={() => setShowConversationEditModal(true)}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
            >
              <SquarePen size={18} color="#37352f" />
            </TouchableOpacity>
          ) : null
        }
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Context badge */}
        {contextItem && (
          <View className="px-4 pb-2">
            <ContextBadge item={contextItem} />
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 20,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {isLoadingMessages ? (
            <View className="flex-1 items-center justify-center py-8">
              <Text className="text-gray-500">로딩 중...</Text>
            </View>
          ) : messages && messages.length > 0 ? (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <View className="flex-1 items-center justify-center py-8">
              <Text className="text-center text-gray-400">
                {contextItem
                  ? "이 항목에 대해 질문해 보세요"
                  : "메시지를 입력해 대화를 시작하세요"}
              </Text>
            </View>
          )}

          {/* Generating indicator / streaming response */}
          {isGenerating && <ChatStreamingMessage content={streamingText} />}
        </ScrollView>

        {error && (
          <View className="px-4 pb-2">
            <View className="rounded-2xl bg-red-50 px-3 py-2">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          </View>
        )}

        {/* Input */}
        <ChatInput onSend={handleSend} isLoading={isGenerating} />

        <ChatAISetupDialog
          open={showAISetupDialog}
          isCheckingOptions={isCheckingAIOptions}
          models={availableLocalModels}
          selectedModelId={selectedLocalModelId}
          onSelectModel={handleSelectChatModel}
          onOpenSettings={handleOpenSettings}
          onBack={() => router.back()}
        />

        {/* Edit Modal */}
        <ConversationEditModal
          visible={showConversationEditModal}
          conversation={conversation}
          onSave={handleSaveConversationDetails}
          onCancel={() => setShowConversationEditModal(false)}
          onDelete={handleRequestDeleteConversation}
        />

        <MessageEditModal
          visible={editingMessage !== null}
          message={editingMessage}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />

        {/* Back Confirmation Dialog */}
        <AlertDialog open={showBackDialog} onOpenChange={setShowBackDialog}>
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
              <AlertDialogAction
                onPress={handleConfirmBack}
                className="bg-destructive"
              >
                <Text>나가기</Text>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
              <AlertDialogAction
                onPress={handleConfirmDelete}
                className="bg-destructive"
              >
                <Text>삭제</Text>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={showDeleteConversationDialog}
          onOpenChange={setShowDeleteConversationDialog}
        >
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
              <AlertDialogAction
                onPress={handleConfirmDeleteConversation}
                className="bg-destructive"
              >
                <Text>삭제</Text>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </KeyboardAvoidingView>
    </View>
  );
}
