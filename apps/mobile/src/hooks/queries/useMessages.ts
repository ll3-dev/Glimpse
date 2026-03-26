/**
 * useMessagesQuery Hook
 *
 * React Query hook for fetching messages of a conversation.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getConversationMessages } from '@/src/features/chat';
import type { Message } from '@glimpse/shared';
import { queryKeys } from '@/src/lib/query-keys';

/**
 * Hook to fetch all messages for a conversation.
 */
export function useMessagesQuery(
  conversationId: string | undefined
): UseQueryResult<Message[], Error> {
  return useQuery({
    queryKey: queryKeys.chat.messages(conversationId ?? ''),
    queryFn: async (): Promise<Message[]> => {
      if (!conversationId) {
        return [];
      }
      const result = await getConversationMessages(conversationId);
      if (result.success === false) {
        throw new Error(result.error.message);
      }
      return result.messages;
    },
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
