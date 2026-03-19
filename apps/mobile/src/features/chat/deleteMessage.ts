/**
 * Delete Message Use Case
 *
 * Soft deletes a message by setting the deletedAt timestamp.
 */

import { eq } from 'drizzle-orm';
import { Effect } from 'effect';
import { db, messages } from '@/src/db';
import {
  appError,
  type AppError,
  type FailureResult,
  type Result,
  runEffectResult,
  tryPromise,
} from '@/src/lib/effect-result';

export type DeleteMessageSuccessResult = { success: true; data: void };
export type DeleteMessageFailureResult = FailureResult;
export type DeleteMessageResult = Result<void>;

export interface DeleteMessageInput {
  messageId: string;
  conversationId: string;
}

export interface DeleteMessageDeps {
  db: typeof db;
  messages: typeof messages;
  eq: typeof eq;
}

const defaultDeps: DeleteMessageDeps = {
  db,
  messages,
  eq,
};

/**
 * Soft deletes a message by setting the deletedAt timestamp.
 */
export function createDeleteMessage(deps: DeleteMessageDeps = defaultDeps) {
  return async function deleteMessage(input: DeleteMessageInput): Promise<DeleteMessageResult> {
    const now = Date.now();

    const queryEffect = tryPromise(
      async () => {
        await deps.db
          .update(deps.messages)
          .set({ deletedAt: now })
          .where(deps.eq(deps.messages.id, input.messageId));
      },
      (error): AppError =>
        appError('DATABASE_ERROR', 'Failed to delete message', error)
    );

    return runEffectResult(queryEffect.pipe(Effect.map(() => undefined)));
  };
}

export const deleteMessage = createDeleteMessage();
