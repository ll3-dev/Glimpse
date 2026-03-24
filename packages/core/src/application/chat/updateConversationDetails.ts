/**
 * Update Conversation Details Use Case
 *
 * Updates editable conversation metadata.
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

export type UpdateConversationDetailsSuccessResult = { success: true; data: Conversation };
export type UpdateConversationDetailsFailureResult = FailureResult;
export type UpdateConversationDetailsResult = Result<Conversation>;

export interface UpdateConversationDetailsInput {
  conversationId: string;
  title: string;
  icon: string | null;
}

export interface UpdateConversationDetailsDeps {
  coreClient: Pick<CoreClient, 'updateConversation'>;
}

export function createUpdateConversationDetails(
  deps: UpdateConversationDetailsDeps
) {
  return async function updateConversationDetails(
    input: UpdateConversationDetailsInput
  ): Promise<UpdateConversationDetailsResult> {
    const now = Date.now();
    const nextTitle = input.title.trim() || null;

    const queryEffect = Effect.tryPromise({
      try: () =>
        deps.coreClient.updateConversation(input.conversationId, {
          title: nextTitle,
          icon: input.icon,
          updatedAt: now,
        }),
      catch: (error) =>
        appError('DATABASE_ERROR', 'Failed to update conversation details', error),
    });

    return runEffectResult(queryEffect);
  };
}
