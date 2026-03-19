/**
 * Delete Conversation Use Case
 *
 * Soft deletes a conversation and its messages.
 */

import { eq } from 'drizzle-orm';
import { Effect } from 'effect';
import { db, conversations, messages } from '@/src/db';
import {
  appError,
  type AppError,
  type FailureResult,
  type Result,
  runEffectResult,
  tryPromise,
} from '@/src/lib/effect-result';

export type DeleteConversationSuccessResult = { success: true; data: void };
export type DeleteConversationFailureResult = FailureResult;
export type DeleteConversationResult = Result<void>;

export interface DeleteConversationInput {
  conversationId: string;
}

export interface DeleteConversationDeps {
  db: typeof db;
  conversations: typeof conversations;
  messages: typeof messages;
  eq: typeof eq;
}

const defaultDeps: DeleteConversationDeps = {
  db,
  conversations,
  messages,
  eq,
};

export function createDeleteConversation(deps: DeleteConversationDeps = defaultDeps) {
  return async function deleteConversation(
    input: DeleteConversationInput
  ): Promise<DeleteConversationResult> {
    const now = Date.now();

    const queryEffect = tryPromise(
      async () => {
        await deps.db
          .update(deps.messages)
          .set({ deletedAt: now })
          .where(deps.eq(deps.messages.conversationId, input.conversationId));

        await deps.db
          .update(deps.conversations)
          .set({ deletedAt: now, updatedAt: now })
          .where(deps.eq(deps.conversations.id, input.conversationId));
      },
      (error): AppError =>
        appError('DATABASE_ERROR', 'Failed to delete conversation', error)
    );

    return runEffectResult(queryEffect.pipe(Effect.map(() => undefined)));
  };
}

export const deleteConversation = createDeleteConversation();
