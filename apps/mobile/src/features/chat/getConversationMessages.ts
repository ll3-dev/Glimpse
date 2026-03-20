/**
 * Get Conversation Messages Use Case
 *
 * Retrieves all messages for a specific conversation.
 * Ordered by creation time, oldest first.
 */

import { Effect } from 'effect';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '@/src/lib/effect-result';
import type { Message } from '@glimpse/shared';

export type GetMessagesSuccessResult = { success: true; data: Message[] };
export type GetMessagesFailureResult = FailureResult;
export type GetMessagesResult = Result<Message[]>;

export interface GetConversationMessagesDeps {
  coreClient: Pick<MobileCoreClient, 'listConversationMessages'>;
}

const defaultDeps: GetConversationMessagesDeps = {
  coreClient: mobileCoreClient,
};

/**
 * Retrieves all messages for a conversation, ordered by creation date (oldest first).
 */
export function createGetConversationMessages(deps: GetConversationMessagesDeps = defaultDeps) {
  return async function getConversationMessages(conversationId: string): Promise<GetMessagesResult> {
    const queryEffect = Effect.tryPromise({
      try: () => deps.coreClient.listConversationMessages(conversationId),
      catch: (error) => appError('DATABASE_ERROR', 'Failed to retrieve messages', error),
    });

    return runEffectResult(queryEffect.pipe(Effect.map((items) => items as Message[])));
  };
}

export const getConversationMessages = createGetConversationMessages();
