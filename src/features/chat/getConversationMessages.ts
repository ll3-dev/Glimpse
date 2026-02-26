/**
 * Get Conversation Messages Use Case
 *
 * Retrieves all messages for a specific conversation.
 * Ordered by creation time, oldest first.
 */

import { asc, eq } from 'drizzle-orm';
import { Effect } from 'effect';
import { db, messages, type Message } from '@/src/db';
import {
  appError,
  type AppError,
  type FailureResult,
  type Result,
  runEffectResult,
  tryPromise,
} from '@/src/lib/effect-result';

export type GetMessagesSuccessResult = { success: true; data: Message[] };
export type GetMessagesFailureResult = FailureResult;
export type GetMessagesResult = Result<Message[]>;

export interface GetConversationMessagesDeps {
  db: typeof db;
  messages: typeof messages;
  eq: typeof eq;
  asc: typeof asc;
}

const defaultDeps: GetConversationMessagesDeps = {
  db,
  messages,
  eq,
  asc,
};

/**
 * Retrieves all messages for a conversation, ordered by creation date (oldest first).
 */
export function createGetConversationMessages(deps: GetConversationMessagesDeps = defaultDeps) {
  return async function getConversationMessages(conversationId: string): Promise<GetMessagesResult> {
    const queryEffect = tryPromise(
      () =>
        deps.db
          .select()
          .from(deps.messages)
          .where(deps.eq(deps.messages.conversationId, conversationId))
          .orderBy(deps.asc(deps.messages.createdAt)),
      (error): AppError =>
        appError('DATABASE_ERROR', 'Failed to retrieve messages', error)
    );

    return runEffectResult(queryEffect.pipe(Effect.map((items) => items as Message[])));
  };
}

export const getConversationMessages = createGetConversationMessages();
