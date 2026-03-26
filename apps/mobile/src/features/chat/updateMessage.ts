import {
  createUpdateMessage,
  type UpdateMessageDeps,
  type UpdateMessageFailureResult,
  type UpdateMessageInput,
  type UpdateMessageResult,
  type UpdateMessageSuccessResult,
} from '@/src/features/core/application/chat';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: UpdateMessageDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'updateMessage'>,
};
export type {
  UpdateMessageDeps,
  UpdateMessageFailureResult,
  UpdateMessageInput,
  UpdateMessageResult,
  UpdateMessageSuccessResult,
};
export { createUpdateMessage };
export const updateMessage = createUpdateMessage(defaultDeps);
