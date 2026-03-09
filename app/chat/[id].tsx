/**
 * Chat Detail Screen
 *
 * Individual conversation view with AI chat.
 */

import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  useMessagesQuery,
  useKnowledgeItemsQuery,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
} from '@/src/hooks';
import { ChatMessage, ChatInput, ContextBadge, MessageEditModal } from '@/src/components/chat';
import { useChat } from '@/src/components/chat/hooks/useChat';
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
import { ScreenHeader } from '@/src/ui/primitives/screen-header';
import type { Message } from '@/src/db';

export default function ChatDetailScreen() {
  const { id, contextItem: contextItemId } = useLocalSearchParams<{ id: string; contextItem?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const { data: messages, isLoading: isLoadingMessages } = useMessagesQuery(id);
  const { data: knowledgeItems } = useKnowledgeItemsQuery();

  // Find context item if provided
  const contextItem = contextItemId && knowledgeItems
    ? knowledgeItems.find((item) => item.id === contextItemId)
    : null;

  const { sendMessage, isGenerating, streamingText, abortAndSave } = useChat({
    conversationId: id,
    contextItem,
  });

  // Edit/Delete state
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [showBackDialog, setShowBackDialog] = useState(false);

  // Mutations
  const updateMessage = useUpdateMessageMutation();
  const deleteMessage = useDeleteMessageMutation();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages?.length]);

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
    await sendMessage(text);
    // Scroll to bottom after sending
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-app-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top }}
      keyboardVerticalOffset={0}
    >
      <ScreenHeader
        title="채팅"
        leftElement={
          <TouchableOpacity
            onPress={handleBackPress}
            className="h-10 w-10 items-center justify-center -ml-3"
          >
            <ChevronLeft size={24} color="#37352f" />
          </TouchableOpacity>
        }
      />

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
          flexGrow: 1 
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
            <Text className="text-gray-400 text-center">
              {contextItem
                ? '이 항목에 대해 질문해 보세요'
                : '메시지를 입력해 대화를 시작하세요'}
            </Text>
          </View>
        )}

        {/* Generating indicator / streaming response */}
        {isGenerating && (
          <View className="flex-row justify-start mb-3">
            <View className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%]">
              {streamingText ? (
                <Text className="text-gray-900 text-base leading-5">{streamingText}</Text>
              ) : (
                <Text className="text-gray-500">생각 중...</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <ChatInput onSend={handleSend} isLoading={isGenerating} />

      {/* Edit Modal */}
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
            <AlertDialogTitle>응답 생성 중</AlertDialogTitle>
            <AlertDialogDescription>
              AI가 응답을 생성하고 있습니다. 나가면 지금까지 생성된 내용이 저장됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onPress={handleConfirmBack} className="bg-destructive">
              나가기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>메시지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 메시지를 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onPress={handleConfirmDelete} className="bg-destructive">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </KeyboardAvoidingView>
  );
}
