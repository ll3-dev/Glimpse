import {
  createCreateConversation,
  type CreateConversationDeps,
  type CreateConversationFailureResult,
  type CreateConversationInput,
  type CreateConversationResult,
  type CreateConversationSuccessResult,
} from '@glimpse/features';
import { generateId } from '@/src/lib/id';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

function getDefaultDeps(): CreateConversationDeps {
  return {
    coreClient: mobileCoreClient as Pick<MobileCoreClient, 'createConversation'>,
    generateId,
  };
}
export type {
  CreateConversationDeps,
  CreateConversationFailureResult,
  CreateConversationInput,
  CreateConversationResult,
  CreateConversationSuccessResult,
};
export { createCreateConversation };
export function createConversation(
  input: Parameters<ReturnType<typeof createCreateConversation>>[0]
) {
  return createCreateConversation(getDefaultDeps())(input);
}
