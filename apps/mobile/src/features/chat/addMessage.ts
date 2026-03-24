import {
  createAddMessage,
  type AddMessageDeps,
  type AddMessageInput,
  type AddMessageResult,
  type AddMessageFailureResult,
  type AddMessageSuccessResult,
} from '@glimpse/core/application/chat';
import { generateId } from '@/src/lib/id';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: AddMessageDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'addMessage'>,
  generateId,
};
export type {
  AddMessageDeps,
  AddMessageFailureResult,
  AddMessageInput,
  AddMessageResult,
  AddMessageSuccessResult,
};
export { createAddMessage };
export const addMessage = createAddMessage(defaultDeps);
