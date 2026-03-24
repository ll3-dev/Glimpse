/**
 * Update Conversation Title Use Case
 *
 * Updates the title of a conversation.
 */

import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '../../foundation/effect-result';
import { Effect } from 'effect';
import type { Conversation } from '@glimpse/shared';
import type { CoreClient } from '../../ports/core-client';

export type UpdateTitleSuccessResult = { success: true; data: Conversation };
export type UpdateTitleFailureResult = FailureResult;
export type UpdateTitleResult = Result<Conversation>;

export interface UpdateConversationTitleInput {
  conversationId: string;
  title: string;
}

export interface UpdateConversationTitleDeps {
  coreClient: Pick<CoreClient, 'updateConversation'>;
}

/**
 * Updates the title of a conversation.
 */
export function createUpdateConversationTitle(deps: UpdateConversationTitleDeps) {
  return async function updateConversationTitle(
    input: UpdateConversationTitleInput
  ): Promise<UpdateTitleResult> {
    const now = Date.now();

    const queryEffect = Effect.tryPromise({
      try: () =>
        deps.coreClient.updateConversation(input.conversationId, {
          title: input.title,
          updatedAt: now,
        }),
      catch: (error) =>
        appError('DATABASE_ERROR', 'Failed to update conversation title', error),
    });

    return runEffectResult(queryEffect);
  };
}
