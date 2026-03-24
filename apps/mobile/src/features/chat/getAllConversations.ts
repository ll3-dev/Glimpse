import {
  createGetAllConversations,
  type GetAllConversationsDeps,
  type GetConversationsFailureResult,
  type GetConversationsResult,
  type GetConversationsSuccessResult,
} from '@glimpse/core/application/chat';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: GetAllConversationsDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'listConversations'>,
};
export type {
  GetAllConversationsDeps,
  GetConversationsFailureResult,
  GetConversationsResult,
  GetConversationsSuccessResult,
};
export { createGetAllConversations };
export const getAllConversations = createGetAllConversations(defaultDeps);
