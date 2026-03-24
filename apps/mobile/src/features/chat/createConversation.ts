import {
  createCreateConversation,
  type CreateConversationDeps,
  type CreateConversationFailureResult,
  type CreateConversationInput,
  type CreateConversationResult,
  type CreateConversationSuccessResult,
} from '@glimpse/core/application/chat';
import { generateId } from '@/src/lib/id';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: CreateConversationDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'createConversation'>,
  generateId,
};
export type {
  CreateConversationDeps,
  CreateConversationFailureResult,
  CreateConversationInput,
  CreateConversationResult,
  CreateConversationSuccessResult,
};
export { createCreateConversation };
export const createConversation = createCreateConversation(defaultDeps);
