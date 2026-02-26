/**
 * useMessagesQuery Hook
 *
 * React Query hook for fetching messages of a conversation.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getConversationMessages } from '@/src/features/chat';
import { type Message } from '@/src/db';
import { queryKeys } from '@/src/lib/query-keys';
import { effectQueryFn } from '@/src/lib/effect-query';

/**
 * Hook to fetch all messages for a conversation.
 */
export function useMessagesQuery(
  conversationId: string | undefined
): UseQueryResult<Message[], Error> {
  return useQuery({
    queryKey: queryKeys.chat.messages(conversationId ?? ''),
    queryFn: () => {
      if (!conversationId) {
        return Promise.resolve([]);
      }
      return effectQueryFn(() => getConversationMessages(conversationId))();
    },
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
