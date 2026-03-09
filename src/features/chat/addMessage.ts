/**
 * Add Message Use Case
 *
 * Adds a new message to a conversation.
 */

import { eq } from 'drizzle-orm';
import { db, messages, conversations, type Message, type NewMessage } from '@/src/db';
import {
  appError,
  type AppError,
  type FailureResult,
  type Result,
  runEffectResult,
  tryPromise,
} from '@/src/lib/effect-result';
import { generateId } from '@/src/lib/id';

export type AddMessageSuccessResult = { success: true; data: Message };
export type AddMessageFailureResult = FailureResult;
export type AddMessageResult = Result<Message>;

export interface AddMessageInput {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface AddMessageDeps {
  db: typeof db;
  messages: typeof messages;
  conversations: typeof conversations;
  eq: typeof eq;
  generateId: () => string;
}

const defaultDeps: AddMessageDeps = {
  db,
  messages,
  conversations,
  eq,
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
    };

    const queryEffect = tryPromise(
      async () => {
        // Insert message
        await deps.db.insert(deps.messages).values(newMessage);
        // Update conversation's updatedAt
        await deps.db
          .update(deps.conversations)
          .set({ updatedAt: now })
          .where(deps.eq(deps.conversations.id, input.conversationId));

        return newMessage as Message;
      },
      (error): AppError =>
        appError('DATABASE_ERROR', 'Failed to add message', error)
    );

    return runEffectResult(queryEffect);
  };
}

export const addMessage = createAddMessage();
