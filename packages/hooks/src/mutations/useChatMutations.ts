import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Conversation, Message, ConversationPatch, MessagePatch } from '@glimpse/shared';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

export function useCreateConversationMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversation: Conversation) => coreClient.createConversation(conversation),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.chat.conversations }),
  });
}

export function useUpdateConversationMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ConversationPatch }) =>
      coreClient.updateConversation(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.chat.conversations }),
  });
}

export function useDeleteConversationMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deletedAt }: { id: string; deletedAt: number }) =>
      coreClient.deleteConversation(id, deletedAt),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.chat.conversations }),
  });
}

export function useAddMessageMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: Message) => coreClient.addMessage(message),
    onSuccess: (_data, message) => {
      qc.invalidateQueries({ queryKey: queryKeys.chat.messages(message.conversationId) });
      qc.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}

export function useUpdateMessageMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MessagePatch }) =>
      coreClient.updateMessage(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.chat.all }),
  });
}

export function useDeleteMessageMutation() {
  const coreClient = useCoreClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deletedAt }: { id: string; deletedAt: number }) =>
      coreClient.deleteMessage(id, deletedAt),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.chat.all }),
  });
}
