/**
 * Get All Conversations Use Case
 *
 * Retrieves all chat conversations from the database.
 * Ordered by last updated time, most recent first.
 */

import { desc, isNull } from 'drizzle-orm';
import { Effect } from 'effect';
import { db, conversations, type Conversation } from '@/src/db';
import {
  appError,
  type AppError,
  type FailureResult,
  type Result,
  runEffectResult,
  tryPromise,
} from '@/src/lib/effect-result';

export type GetConversationsSuccessResult = { success: true; data: Conversation[] };
export type GetConversationsFailureResult = FailureResult;
export type GetConversationsResult = Result<Conversation[]>;

export interface GetAllConversationsDeps {
  db: typeof db;
  conversations: typeof conversations;
  desc: typeof desc;
  isNull: typeof isNull;
}

const defaultDeps: GetAllConversationsDeps = {
  db,
  conversations,
  desc,
  isNull,
};

/**
 * Retrieves all conversations from the database, ordered by updated date (newest first).
 */
export function createGetAllConversations(deps: GetAllConversationsDeps = defaultDeps) {
  return async function getAllConversations(): Promise<GetConversationsResult> {
    const queryEffect = tryPromise(
      () =>
        deps.db
          .select()
          .from(deps.conversations)
          .where(deps.isNull(deps.conversations.deletedAt))
          .orderBy(deps.desc(deps.conversations.updatedAt)),
      (error): AppError =>
        appError('DATABASE_ERROR', 'Failed to retrieve conversations', error)
    );

    return runEffectResult(queryEffect.pipe(Effect.map((items) => items as Conversation[])));
  };
}

export const getAllConversations = createGetAllConversations();
