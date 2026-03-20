/**
 * Add Message Use Case
 *
 * Adds a new message to a conversation.
 */

import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '@/src/lib/effect-result';
import { generateId } from '@/src/lib/id';
import { Effect } from 'effect';
import type { Message, NewMessage } from '@glimpse/shared';

export type AddMessageSuccessResult = { success: true; data: Message };
export type AddMessageFailureResult = FailureResult;
export type AddMessageResult = Result<Message>;

export interface AddMessageInput {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface AddMessageDeps {
  coreClient: Pick<MobileCoreClient, 'addMessage'>;
  generateId: () => string;
}

const defaultDeps: AddMessageDeps = {
  coreClient: mobileCoreClient,
  generateId,
};

/**
 * Adds a new message to a conversation and updates the conversation's updatedAt.
 */
export function createAddMessage(deps: AddMessageDeps = defaultDeps) {
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

export const addMessage = createAddMessage();
