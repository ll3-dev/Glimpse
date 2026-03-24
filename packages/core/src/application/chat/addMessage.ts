/**
 * Add Message Use Case
 *
 * Adds a new message to a conversation.
 */

import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '../../foundation/effect-result';
import { Effect } from 'effect';
import type { Message, NewMessage } from '@glimpse/shared';
import type { CoreClient } from '../../ports/core-client';

export type AddMessageSuccessResult = { success: true; data: Message };
export type AddMessageFailureResult = FailureResult;
export type AddMessageResult = Result<Message>;

export interface AddMessageInput {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface AddMessageDeps {
  coreClient: Pick<CoreClient, 'addMessage'>;
  generateId: () => string;
}

/**
 * Adds a new message to a conversation and updates the conversation's updatedAt.
 */
export function createAddMessage(deps: AddMessageDeps) {
  return async function addMessage(input: AddMessageInput): Promise<AddMessageResult> {
    const now = Date.now();
    const newMessage: NewMessage = {
      id: deps.generateId(),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      createdAt: now,
      updatedAt: null,
      deletedAt: null,
    };

    const queryEffect = Effect.tryPromise({
      try: () => deps.coreClient.addMessage(newMessage),
      catch: (error) => {
        console.error('[addMessage] Failed', {
          input,
          error,
        });
        return appError('DATABASE_ERROR', 'Failed to add message', error);
      },
    });

    return runEffectResult(queryEffect);
  };
}
