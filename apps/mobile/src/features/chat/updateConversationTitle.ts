/**
 * Update Conversation Title Use Case
 *
 * Updates the title of a conversation.
 */

import { eq } from 'drizzle-orm';
import { db, conversations, type Conversation } from '@/src/db';
import {
  appError,
  type AppError,
  type FailureResult,
  type Result,
  runEffectResult,
  tryPromise,
} from '@/src/lib/effect-result';

export type UpdateTitleSuccessResult = { success: true; data: Conversation };
export type UpdateTitleFailureResult = FailureResult;
export type UpdateTitleResult = Result<Conversation>;

export interface UpdateConversationTitleInput {
  conversationId: string;
  title: string;
}

export interface UpdateConversationTitleDeps {
  db: typeof db;
  conversations: typeof conversations;
  eq: typeof eq;
}

const defaultDeps: UpdateConversationTitleDeps = {
  db,
  conversations,
  eq,
};

/**
 * Updates the title of a conversation.
 */
export function createUpdateConversationTitle(deps: UpdateConversationTitleDeps = defaultDeps) {
  return async function updateConversationTitle(
    input: UpdateConversationTitleInput
  ): Promise<UpdateTitleResult> {
    const now = Date.now();

    const queryEffect = tryPromise(
      async () => {
        await deps.db
          .update(deps.conversations)
          .set({ title: input.title, updatedAt: now })
          .where(deps.eq(deps.conversations.id, input.conversationId));

        return {
          id: input.conversationId,
          title: input.title,
          updatedAt: now,
        } as Conversation;
      },
      (error): AppError =>
        appError('DATABASE_ERROR', 'Failed to update conversation title', error)
    );

    return runEffectResult(queryEffect);
  };
}

export const updateConversationTitle = createUpdateConversationTitle();
