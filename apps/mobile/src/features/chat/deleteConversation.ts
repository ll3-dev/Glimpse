/**
 * Delete Conversation Use Case
 *
 * Soft deletes a conversation and its messages.
 */

import { Effect } from 'effect';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '@/src/lib/effect-result';

export type DeleteConversationSuccessResult = { success: true; data: void };
export type DeleteConversationFailureResult = FailureResult;
export type DeleteConversationResult = Result<void>;

export interface DeleteConversationInput {
  conversationId: string;
}

export interface DeleteConversationDeps {
  coreClient: Pick<MobileCoreClient, 'deleteConversation'>;
}

const defaultDeps: DeleteConversationDeps = {
  coreClient: mobileCoreClient,
};

export function createDeleteConversation(deps: DeleteConversationDeps = defaultDeps) {
  return async function deleteConversation(
    input: DeleteConversationInput
  ): Promise<DeleteConversationResult> {
    const now = Date.now();

    const queryEffect = Effect.tryPromise({
      try: () => deps.coreClient.deleteConversation(input.conversationId, now),
      catch: (error) => appError('DATABASE_ERROR', 'Failed to delete conversation', error),
    });

    return runEffectResult(queryEffect.pipe(Effect.map(() => undefined)));
  };
}

export const deleteConversation = createDeleteConversation();
