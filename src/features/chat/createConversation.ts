/**
 * Create Conversation Use Case
 *
 * Creates a new chat conversation.
 */

import { nanoid } from 'nanoid';
import { db, conversations, type Conversation, type NewConversation } from '@/src/db';
import {
  appError,
  type AppError,
  type FailureResult,
  type Result,
  runEffectResult,
  tryPromise,
} from '@/src/lib/effect-result';

export type CreateConversationSuccessResult = { success: true; data: Conversation };
export type CreateConversationFailureResult = FailureResult;
export type CreateConversationResult = Result<Conversation>;

export interface CreateConversationInput {
  title?: string;
  contextItemId?: string;
}

export interface CreateConversationDeps {
  db: typeof db;
  conversations: typeof conversations;
  nanoid: () => string;
}

const defaultDeps: CreateConversationDeps = {
  db,
  conversations,
  nanoid: () => nanoid(),
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
      id: deps.nanoid(),
      title: input.title ?? null,
      contextItemId: input.contextItemId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const queryEffect = tryPromise(
      async () => {
        await deps.db.insert(deps.conversations).values(newConversation);
        return newConversation as Conversation;
      },
      (error): AppError =>
        appError('DATABASE_ERROR', 'Failed to create conversation', error)
    );

    return runEffectResult(queryEffect);
  };
}

export const createConversation = createCreateConversation();
