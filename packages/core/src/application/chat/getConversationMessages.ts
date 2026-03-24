/**
 * Get Conversation Messages Use Case
 *
 * Retrieves all messages for a specific conversation.
 * Ordered by creation time, oldest first.
 */

import { Effect } from 'effect';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '../../foundation/effect-result';
import type { Message } from '@glimpse/shared';
import type { CoreClient } from '../../ports/core-client';

export type GetMessagesSuccessResult = { success: true; data: Message[] };
export type GetMessagesFailureResult = FailureResult;
export type GetMessagesResult = Result<Message[]>;

export interface GetConversationMessagesDeps {
  coreClient: Pick<CoreClient, 'listConversationMessages'>;
}

/**
 * Retrieves all messages for a conversation, ordered by creation date (oldest first).
 */
export function createGetConversationMessages(deps: GetConversationMessagesDeps) {
  return async function getConversationMessages(conversationId: string): Promise<GetMessagesResult> {
    const queryEffect = Effect.tryPromise({
      try: () => deps.coreClient.listConversationMessages(conversationId),
      catch: (error) => appError('DATABASE_ERROR', 'Failed to retrieve messages', error),
    });

    return runEffectResult(queryEffect.pipe(Effect.map((items) => items as Message[])));
  };
}
