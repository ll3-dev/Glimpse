import {
  createDeleteMessage,
  type DeleteMessageDeps,
  type DeleteMessageFailureResult,
  type DeleteMessageInput,
  type DeleteMessageResult,
  type DeleteMessageSuccessResult,
} from '@glimpse/core/application/chat';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: DeleteMessageDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'deleteMessage'>,
};
export type {
  DeleteMessageDeps,
  DeleteMessageFailureResult,
  DeleteMessageInput,
  DeleteMessageResult,
  DeleteMessageSuccessResult,
};
export { createDeleteMessage };
export const deleteMessage = createDeleteMessage(defaultDeps);
