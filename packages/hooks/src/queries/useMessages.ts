import { useQuery } from '@tanstack/react-query';
import type { Message } from '@glimpse/shared';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

export function useMessagesQuery(conversationId: string) {
  const coreClient = useCoreClient();
  return useQuery({
    queryKey: queryKeys.chat.messages(conversationId),
    queryFn: () => coreClient.listConversationMessages(conversationId),
    enabled: !!conversationId,
  });
}
