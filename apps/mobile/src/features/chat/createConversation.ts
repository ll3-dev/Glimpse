/**
 * Create Conversation Use Case
 *
 * Creates a new chat conversation.
 */

import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';
import {
  appError,
  type FailureResult,
  type Result,
  runEffectResult,
} from '@/src/lib/effect-result';
import { generateId } from '@/src/lib/id';
import { Effect } from 'effect';
import type { Conversation, NewConversation } from '@glimpse/shared';

export type CreateConversationSuccessResult = { success: true; data: Conversation };
export type CreateConversationFailureResult = FailureResult;
export type CreateConversationResult = Result<Conversation>;

export interface CreateConversationInput {
  title?: string;
  icon?: string;
  contextItemId?: string;
}

export interface CreateConversationDeps {
  coreClient: Pick<MobileCoreClient, 'createConversation'>;
  generateId: () => string;
}

const defaultDeps: CreateConversationDeps = {
  coreClient: mobileCoreClient,
  generateId,
};

/**
 * Creates a new conversation.
 */
export function createCreateConversation(deps: CreateConversationDeps = defaultDeps) {
  return async function createConversation(
    input: CreateConversationInput = {}
  ): Promise<CreateConversationResult> {
    const now = Date.now();
    const newConversation: NewConversation = {
      id: deps.generateId(),
      title: input.title ?? null,
      icon: input.icon ?? null,
      contextItemId: input.contextItemId ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const queryEffect = Effect.tryPromise({
      try: () => deps.coreClient.createConversation(newConversation),
      catch: (error) => appError('DATABASE_ERROR', 'Failed to create conversation', error),
    });

    return runEffectResult(queryEffect);
  };
}

export const createConversation = createCreateConversation();
