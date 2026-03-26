import {
  createGetConversationMessages,
  type GetConversationMessagesDeps,
  type GetMessagesFailureResult,
  type GetMessagesResult,
  type GetMessagesSuccessResult,
} from '@/src/features/core/application/chat';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: GetConversationMessagesDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'listConversationMessages'>,
};
export type {
  GetConversationMessagesDeps,
  GetMessagesFailureResult,
  GetMessagesResult,
  GetMessagesSuccessResult,
};
export { createGetConversationMessages };
export const getConversationMessages = createGetConversationMessages(defaultDeps);
