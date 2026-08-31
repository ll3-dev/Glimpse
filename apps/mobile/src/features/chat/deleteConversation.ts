import {
  createDeleteConversation,
  type DeleteConversationDeps,
  type DeleteConversationFailureResult,
  type DeleteConversationInput,
  type DeleteConversationResult,
  type DeleteConversationSuccessResult,
} from '@glimpse/features';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

function getDefaultDeps(): DeleteConversationDeps {
  return {
    coreClient: mobileCoreClient as Pick<MobileCoreClient, 'deleteConversation'>,
  };
}
export type {
  DeleteConversationDeps,
  DeleteConversationFailureResult,
  DeleteConversationInput,
  DeleteConversationResult,
  DeleteConversationSuccessResult,
};
export { createDeleteConversation };
export function deleteConversation(
  input: Parameters<ReturnType<typeof createDeleteConversation>>[0]
) {
  return createDeleteConversation(getDefaultDeps())(input);
}
