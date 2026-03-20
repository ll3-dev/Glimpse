/**
 * Update Message Use Case
 *
 * Updates the content of an existing message.
 */

import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '@/src/lib/effect-result';
import { Effect } from 'effect';
import type { Message } from '@glimpse/shared';

export type UpdateMessageSuccessResult = { success: true; data: Message };
export type UpdateMessageFailureResult = FailureResult;
export type UpdateMessageResult = Result<Message>;

export interface UpdateMessageInput {
  messageId: string;
  content: string;
  conversationId: string;
}

export interface UpdateMessageDeps {
  coreClient: Pick<MobileCoreClient, 'updateMessage'>;
}

const defaultDeps: UpdateMessageDeps = {
  coreClient: mobileCoreClient,
};

/**
 * Updates a message's content and sets the updatedAt timestamp.
 */
export function createUpdateMessage(deps: UpdateMessageDeps = defaultDeps) {
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

export const updateMessage = createUpdateMessage();
