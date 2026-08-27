/**
 * Chat Mutations Hooks
 *
 * React Query mutation hooks for chat operations.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createConversation,
  addMessage,
  updateMessage,
  deleteMessage,
  deleteConversation,
  updateConversationTitle,
  updateConversationDetails,
  type CreateConversationInput,
  type AddMessageInput,
  type UpdateConversationTitleInput,
  type UpdateConversationDetailsInput,
  type DeleteConversationInput,
  type UpdateMessageInput,
  type DeleteMessageInput,
} from "@/src/features/chat";
import type { Conversation, Message } from "@glimpse/shared";
import { queryKeys } from "@/src/lib/query-keys";

/**
 * Hook to create a new conversation.
 */
export function useCreateConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreateConversationInput,
    ): Promise<Conversation> => {
      const result = await createConversation(input);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.conversation;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
      // Return data so that component-level onSuccess can access it
      return data;
    },
  });
}

/**
 * Hook to add a message to a conversation.
 */
export function useAddMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddMessageInput): Promise<Message> => {
      const result = await addMessage(input);
      if (result.success === false) {
        throw new Error(result.error.code + ": " + result.error.message);
      }
      return result.message;
    },
    onSuccess: (message) => {
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(message.conversationId),
      });
      // 리스트 전체 무효화 대신 로컬 패치: addMessage가 conversation에서
      // 바꾸는 건 updated_at뿐이고(Rust add_message가 touch), 쿼리는
      // updated_at DESC 정렬이라 그 순서까지 반영하면 리페치 결과와
      // 동일하다. 대화 한 번 주고받을 때마다 리스트 전체 리페치를 막는다.
      queryClient.setQueryData<Conversation[]>(
        queryKeys.chat.conversations,
        (current) => {
          if (!current) return current;
          const index = current.findIndex(
            (item) => item.id === message.conversationId,
          );
          if (index === -1) return current;
          const touched = {
            ...current[index],
            updatedAt: message.createdAt,
          };
          const rest = current.filter((_, i) => i !== index);
          return [touched, ...rest];
        },
      );
    },
  });
}

/**
 * Hook to update a conversation title.
 */
export function useUpdateConversationTitleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: UpdateConversationTitleInput,
    ): Promise<Conversation> => {
      const result = await updateConversationTitle(input);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}

/**
 * Hook to update conversation metadata.
 */
export function useUpdateConversationDetailsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: UpdateConversationDetailsInput,
    ): Promise<Conversation> => {
      const result = await updateConversationDetails(input);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}

/**
 * Hook to delete a conversation and its messages.
 */
export function useDeleteConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteConversationInput): Promise<void> => {
      const result = await deleteConversation(input);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(
        queryKeys.chat.conversations,
        (current: { id: string }[] | undefined) =>
          current?.filter(
            (conversation) => conversation.id !== variables.conversationId,
          ) ?? [],
      );
      queryClient.removeQueries({
        queryKey: queryKeys.chat.conversation(variables.conversationId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.chat.messages(variables.conversationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all });
    },
  });
}

/**
 * Hook to update a message's content.
 */
export function useUpdateMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: UpdateMessageInput & { conversationId: string },
    ): Promise<Message> => {
      const { conversationId: _, ...updateInput } = input;
      const result = await updateMessage(updateInput);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(variables.conversationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}

/**
 * Hook to soft delete a message.
 */
export function useDeleteMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: DeleteMessageInput & { conversationId: string },
    ): Promise<void> => {
      const { conversationId: _, ...deleteInput } = input;
      const result = await deleteMessage(deleteInput);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(variables.conversationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}
