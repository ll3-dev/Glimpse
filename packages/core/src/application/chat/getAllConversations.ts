/**
 * Get All Conversations Use Case
 *
 * Retrieves all chat conversations from the database.
 * Ordered by last updated time, most recent first.
 */

import { Effect } from 'effect';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '../../foundation/effect-result';
import type { Conversation } from '@glimpse/shared';
import type { CoreClient } from '../../ports/core-client';

export type GetConversationsSuccessResult = { success: true; data: Conversation[] };
export type GetConversationsFailureResult = FailureResult;
export type GetConversationsResult = Result<Conversation[]>;

export interface GetAllConversationsDeps {
  coreClient: Pick<CoreClient, 'listConversations'>;
}

/**
 * Retrieves all conversations from the database, ordered by updated date (newest first).
 */
export function createGetAllConversations(deps: GetAllConversationsDeps) {
  return async function getAllConversations(): Promise<GetConversationsResult> {
    const queryEffect = Effect.tryPromise({
      try: () => deps.coreClient.listConversations(),
      catch: (error) => appError('DATABASE_ERROR', 'Failed to retrieve conversations', error),
    });

    return runEffectResult(queryEffect.pipe(Effect.map((items) => items as Conversation[])));
  };
}
