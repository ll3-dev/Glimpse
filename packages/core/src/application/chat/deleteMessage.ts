/**
 * Delete Message Use Case
 *
 * Soft deletes a message by setting the deletedAt timestamp.
 */

import { Effect } from 'effect';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '../../foundation/effect-result';
import type { CoreClient } from '../../ports/core-client';

export type DeleteMessageSuccessResult = { success: true; data: void };
export type DeleteMessageFailureResult = FailureResult;
export type DeleteMessageResult = Result<void>;

export interface DeleteMessageInput {
  messageId: string;
  conversationId: string;
}

export interface DeleteMessageDeps {
  coreClient: Pick<CoreClient, 'deleteMessage'>;
}

/**
 * Soft deletes a message by setting the deletedAt timestamp.
 */
export function createDeleteMessage(deps: DeleteMessageDeps) {
  return async function deleteMessage(input: DeleteMessageInput): Promise<DeleteMessageResult> {
    const now = Date.now();

    const queryEffect = Effect.tryPromise({
      try: () => deps.coreClient.deleteMessage(input.messageId, now),
      catch: (error) => appError('DATABASE_ERROR', 'Failed to delete message', error),
    });

    return runEffectResult(queryEffect.pipe(Effect.map(() => undefined)));
  };
}
