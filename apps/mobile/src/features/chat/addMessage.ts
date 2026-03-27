import {
  createAddMessage,
  type AddMessageDeps,
  type AddMessageInput,
  type AddMessageResult,
  type AddMessageFailureResult,
  type AddMessageSuccessResult,
} from '@/src/features/core/application/chat';
import { generateId } from '@/src/lib/id';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

function getDefaultDeps(): AddMessageDeps {
  return {
    coreClient: mobileCoreClient as Pick<MobileCoreClient, 'addMessage'>,
    generateId,
  };
}
export type {
  AddMessageDeps,
  AddMessageFailureResult,
  AddMessageInput,
  AddMessageResult,
  AddMessageSuccessResult,
};
export { createAddMessage };
export function addMessage(
  input: Parameters<ReturnType<typeof createAddMessage>>[0]
) {
  return createAddMessage(getDefaultDeps())(input);
}
