/**
 * Update Message Use Case
 *
 * Updates the content of an existing message.
 */

import { eq } from 'drizzle-orm';
import { db, messages, type Message } from '@/src/db';
import {
  appError,
  type AppError,
  type FailureResult,
  type Result,
  runEffectResult,
  tryPromise,
} from '@/src/lib/effect-result';

export type UpdateMessageSuccessResult = { success: true; data: Message };
export type UpdateMessageFailureResult = FailureResult;
export type UpdateMessageResult = Result<Message>;

export interface UpdateMessageInput {
  messageId: string;
  content: string;
  conversationId: string;
}

export interface UpdateMessageDeps {
  db: typeof db;
  messages: typeof messages;
  eq: typeof eq;
}

const defaultDeps: UpdateMessageDeps = {
  db,
  messages,
  eq,
};

/**
 * Updates a message's content and sets the updatedAt timestamp.
 */
export function createUpdateMessage(deps: UpdateMessageDeps = defaultDeps) {
  return async function updateMessage(input: UpdateMessageInput): Promise<UpdateMessageResult> {
    const now = Date.now();

    const queryEffect = tryPromise(
      async () => {
        await deps.db
          .update(deps.messages)
          .set({
            content: input.content,
            updatedAt: now,
          })
          .where(deps.eq(deps.messages.id, input.messageId));

        // Return the updated message
        const updated = await deps.db
          .select()
          .from(deps.messages)
          .where(deps.eq(deps.messages.id, input.messageId));

        return updated[0] as Message;
      },
      (error): AppError =>
        appError('DATABASE_ERROR', 'Failed to update message', error)
    );

    return runEffectResult(queryEffect);
  };
}

export const updateMessage = createUpdateMessage();
