import {
  createGetAllConversations,
  type GetAllConversationsDeps,
  type GetConversationsFailureResult,
  type GetConversationsResult,
  type GetConversationsSuccessResult,
} from '@glimpse/features';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

function getDefaultDeps(): GetAllConversationsDeps {
  return {
    coreClient: mobileCoreClient as Pick<MobileCoreClient, 'listConversations'>,
  };
}
export type {
  GetAllConversationsDeps,
  GetConversationsFailureResult,
  GetConversationsResult,
  GetConversationsSuccessResult,
};
export { createGetAllConversations };
export function getAllConversations() {
  return createGetAllConversations(getDefaultDeps())();
}
