/**
 * Update Conversation Details Use Case
 *
 * Updates editable conversation metadata.
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

export type UpdateConversationDetailsSuccessResult = { success: true; data: Conversation };
export type UpdateConversationDetailsFailureResult = FailureResult;
export type UpdateConversationDetailsResult = Result<Conversation>;

export interface UpdateConversationDetailsInput {
  conversationId: string;
  title: string;
  icon: string | null;
}

export interface UpdateConversationDetailsDeps {
  db: typeof db;
  conversations: typeof conversations;
  eq: typeof eq;
}

const defaultDeps: UpdateConversationDetailsDeps = {
  db,
  conversations,
  eq,
};

export function createUpdateConversationDetails(
  deps: UpdateConversationDetailsDeps = defaultDeps
) {
  return async function updateConversationDetails(
    input: UpdateConversationDetailsInput
  ): Promise<UpdateConversationDetailsResult> {
    const now = Date.now();
    const nextTitle = input.title.trim() || null;

    const queryEffect = tryPromise(
      async () => {
        await deps.db
          .update(deps.conversations)
          .set({ title: nextTitle, icon: input.icon, updatedAt: now })
          .where(deps.eq(deps.conversations.id, input.conversationId));

        return {
          id: input.conversationId,
          title: nextTitle,
          icon: input.icon,
          updatedAt: now,
        } as Conversation;
      },
      (error): AppError =>
        appError('DATABASE_ERROR', 'Failed to update conversation details', error)
    );

    return runEffectResult(queryEffect);
  };
}

export const updateConversationDetails = createUpdateConversationDetails();
