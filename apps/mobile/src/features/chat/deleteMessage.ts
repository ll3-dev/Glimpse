/**
 * Delete Message Use Case
 *
 * Soft deletes a message by setting the deletedAt timestamp.
 */

import { Effect } from 'effect';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '@/src/lib/effect-result';

export type DeleteMessageSuccessResult = { success: true; data: void };
export type DeleteMessageFailureResult = FailureResult;
export type DeleteMessageResult = Result<void>;

export interface DeleteMessageInput {
  messageId: string;
  conversationId: string;
}

export interface DeleteMessageDeps {
  coreClient: Pick<MobileCoreClient, 'deleteMessage'>;
}

const defaultDeps: DeleteMessageDeps = {
  coreClient: mobileCoreClient,
};

/**
 * Soft deletes a message by setting the deletedAt timestamp.
 */
export function createDeleteMessage(deps: DeleteMessageDeps = defaultDeps) {
  return async function deleteMessage(input: DeleteMessageInput): Promise<DeleteMessageResult> {
    const now = Date.now();

    const queryEffect = Effect.tryPromise({
      try: () => deps.coreClient.deleteMessage(input.messageId, now),
      catch: (error) => appError('DATABASE_ERROR', 'Failed to delete message', error),
    });

    return runEffectResult(queryEffect.pipe(Effect.map(() => undefined)));
  };
}

export const deleteMessage = createDeleteMessage();
