/**
 * Chat Mutations Hooks
 *
 * React Query mutation hooks for chat operations.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createConversation,
  addMessage,
  updateConversationTitle,
} from "@/src/features/chat";
import { queryKeys } from '@/src/lib/query-keys';
import { createMutationOptions } from '@/src/lib/effect-query';

/**
 * Hook to create a new conversation.
 */
export function useCreateConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    ...createMutationOptions(createConversation),
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
    ...createMutationOptions(addMessage),
    onSuccess: (_, variables) => {
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.messages(variables.conversationId),
      });
      // Also invalidate conversations list (to update updatedAt)
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}

/**
 * Hook to update a conversation title.
 */
export function useUpdateConversationTitleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    ...createMutationOptions(updateConversationTitle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}
