/**
 * Update Conversation Details Use Case
 *
 * Updates editable conversation metadata.
 */

import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '@/src/lib/effect-result';
import { Effect } from 'effect';
import type { Conversation } from '@glimpse/shared';

export type UpdateConversationDetailsSuccessResult = { success: true; data: Conversation };
export type UpdateConversationDetailsFailureResult = FailureResult;
export type UpdateConversationDetailsResult = Result<Conversation>;

export interface UpdateConversationDetailsInput {
  conversationId: string;
  title: string;
  icon: string | null;
}

export interface UpdateConversationDetailsDeps {
  coreClient: Pick<MobileCoreClient, 'updateConversation'>;
}

const defaultDeps: UpdateConversationDetailsDeps = {
  coreClient: mobileCoreClient,
};

export function createUpdateConversationDetails(
  deps: UpdateConversationDetailsDeps = defaultDeps
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

export const updateConversationDetails = createUpdateConversationDetails();
