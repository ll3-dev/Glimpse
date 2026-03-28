import { useQuery } from '@tanstack/react-query';
import type { Conversation } from '@glimpse/shared';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

export function useConversationsQuery() {
  const coreClient = useCoreClient();
  return useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: () => coreClient.listConversations(),
  });
}
