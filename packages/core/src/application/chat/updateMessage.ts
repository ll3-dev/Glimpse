/**
 * Update Message Use Case
 *
 * Updates the content of an existing message.
 */

import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '../../foundation/effect-result';
import { Effect } from 'effect';
import type { Message } from '@glimpse/shared';
import type { CoreClient } from '../../ports/core-client';

export type UpdateMessageSuccessResult = { success: true; data: Message };
export type UpdateMessageFailureResult = FailureResult;
export type UpdateMessageResult = Result<Message>;

export interface UpdateMessageInput {
  messageId: string;
  content: string;
  conversationId: string;
}

export interface UpdateMessageDeps {
  coreClient: Pick<CoreClient, 'updateMessage'>;
}

/**
 * Updates a message's content and sets the updatedAt timestamp.
 */
export function createUpdateMessage(deps: UpdateMessageDeps) {
  return async function updateMessage(input: UpdateMessageInput): Promise<UpdateMessageResult> {
    const now = Date.now();

    const queryEffect = Effect.tryPromise({
      try: () =>
        deps.coreClient.updateMessage(input.messageId, {
          content: input.content,
          updatedAt: now,
        }),
      catch: (error) => appError('DATABASE_ERROR', 'Failed to update message', error),
    });

    return runEffectResult(queryEffect);
  };
}
