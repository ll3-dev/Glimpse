import {
  createDeleteConversation,
  type DeleteConversationDeps,
  type DeleteConversationFailureResult,
  type DeleteConversationInput,
  type DeleteConversationResult,
  type DeleteConversationSuccessResult,
} from '@glimpse/core/application/chat';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: DeleteConversationDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'deleteConversation'>,
};
export type {
  DeleteConversationDeps,
  DeleteConversationFailureResult,
  DeleteConversationInput,
  DeleteConversationResult,
  DeleteConversationSuccessResult,
};
export { createDeleteConversation };
export const deleteConversation = createDeleteConversation(defaultDeps);
