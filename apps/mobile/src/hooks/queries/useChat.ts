/**
 * useConversationsQuery Hook
 *
 * React Query hook for fetching all chat conversations.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getAllConversations } from '@/src/features/chat';
import { type Conversation } from '@/src/db';
import { queryKeys } from '@/src/lib/query-keys';
import { effectQueryFn } from '@/src/lib/effect-query';

/**
 * Hook to fetch all conversations from the database.
 */
export function useConversationsQuery(): UseQueryResult<Conversation[], Error> {
  return useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: effectQueryFn(getAllConversations),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
