import {
  createGetConversationMessages,
  type GetConversationMessagesDeps,
  type GetMessagesFailureResult,
  type GetMessagesResult,
  type GetMessagesSuccessResult,
} from '@glimpse/features';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

function getDefaultDeps(): GetConversationMessagesDeps {
  return {
    coreClient: mobileCoreClient as Pick<MobileCoreClient, 'listConversationMessages'>,
  };
}
export type {
  GetConversationMessagesDeps,
  GetMessagesFailureResult,
  GetMessagesResult,
  GetMessagesSuccessResult,
};
export { createGetConversationMessages };
export function getConversationMessages(
  conversationId: Parameters<ReturnType<typeof createGetConversationMessages>>[0]
) {
  return createGetConversationMessages(getDefaultDeps())(conversationId);
}
