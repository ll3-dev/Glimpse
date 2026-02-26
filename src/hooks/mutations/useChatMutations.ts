/**
 * Chat Mutations Hooks
 *
 * React Query mutation hooks for chat operations.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import {
  createConversation,
  addMessage,
  updateConversationTitle,
  type CreateConversationInput,
  type AddMessageInput,
  type UpdateConversationTitleInput,
} from '@/src/features/chat';
import { type Conversation, type Message } from '@/src/db';
import { queryKeys } from '@/src/lib/query-keys';
import { createMutationOptions } from '@/src/lib/effect-query';

/**
 * Hook to create a new conversation.
 */
export function useCreateConversationMutation(): UseMutationResult<
  Conversation,
  Error,
  CreateConversationInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    ...createMutationOptions(createConversation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}

/**
 * Hook to add a message to a conversation.
 */
export function useAddMessageMutation(): UseMutationResult<Message, Error, AddMessageInput> {
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
export function useUpdateConversationTitleMutation(): UseMutationResult<
  Conversation,
  Error,
  UpdateConversationTitleInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    ...createMutationOptions(updateConversationTitle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}
