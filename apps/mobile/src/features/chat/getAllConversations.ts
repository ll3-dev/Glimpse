/**
 * Get All Conversations Use Case
 *
 * Retrieves all chat conversations from the database.
 * Ordered by last updated time, most recent first.
 */

import { Effect } from 'effect';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '@/src/lib/effect-result';
import type { Conversation } from '@glimpse/shared';

export type GetConversationsSuccessResult = { success: true; data: Conversation[] };
export type GetConversationsFailureResult = FailureResult;
export type GetConversationsResult = Result<Conversation[]>;

export interface GetAllConversationsDeps {
  coreClient: Pick<MobileCoreClient, 'listConversations'>;
}

const defaultDeps: GetAllConversationsDeps = {
  coreClient: mobileCoreClient,
};

/**
 * Retrieves all conversations from the database, ordered by updated date (newest first).
 */
export function createGetAllConversations(deps: GetAllConversationsDeps = defaultDeps) {
  return async function getAllConversations(): Promise<GetConversationsResult> {
    const queryEffect = Effect.tryPromise({
      try: () => deps.coreClient.listConversations(),
      catch: (error) => appError('DATABASE_ERROR', 'Failed to retrieve conversations', error),
    });

    return runEffectResult(queryEffect.pipe(Effect.map((items) => items as Conversation[])));
  };
}

export const getAllConversations = createGetAllConversations();
