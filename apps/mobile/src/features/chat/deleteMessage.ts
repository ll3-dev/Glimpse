import {
  createDeleteMessage,
  type DeleteMessageDeps,
  type DeleteMessageFailureResult,
  type DeleteMessageInput,
  type DeleteMessageResult,
  type DeleteMessageSuccessResult,
} from '@glimpse/features';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

function getDefaultDeps(): DeleteMessageDeps {
  return {
    coreClient: mobileCoreClient as Pick<MobileCoreClient, 'deleteMessage'>,
  };
}
export type {
  DeleteMessageDeps,
  DeleteMessageFailureResult,
  DeleteMessageInput,
  DeleteMessageResult,
  DeleteMessageSuccessResult,
};
export { createDeleteMessage };
export function deleteMessage(
  input: Parameters<ReturnType<typeof createDeleteMessage>>[0]
) {
  return createDeleteMessage(getDefaultDeps())(input);
}
