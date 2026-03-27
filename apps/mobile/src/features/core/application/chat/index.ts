/**
 * Chat Application Layer
 * Migrated from @glimpse/core/application/chat
 */

import type {
  Conversation,
  ConversationPatch,
  Message,
  MessagePatch,
} from '@glimpse/shared';

// ============================================================================
// Types
// ============================================================================

export interface AppError {
  code: string;
  message: string;
}

export interface AppFailureResult {
  success: false;
  error: AppError;
}

export type AppSuccessResult<T extends object = object> = {
  success: true;
} & T;

export type AppResult<T extends object = object> =
  | AppSuccessResult<T>
  | AppFailureResult;

function toAppError(error: unknown): AppError {
  return {
    code: 'CHAT_ERROR',
    message: error instanceof Error ? error.message : String(error),
  };
}

async function runChatAction<T extends object>(
  action: () => Promise<T>
): Promise<AppResult<T>> {
  try {
    return { success: true, ...(await action()) };
  } catch (error) {
    return { success: false, error: toAppError(error) };
  }
}

export interface CreateConversationInput {
  title?: string | null;
  icon?: string | null;
  contextItemId?: string | null;
}

export interface CreateConversationDeps {
  coreClient: {
    createConversation: (conversation: Conversation) => Promise<Conversation>;
  };
  generateId: () => string;
}

export type CreateConversationSuccessResult = AppSuccessResult<{
  conversation: Conversation;
}>;
export type CreateConversationFailureResult = AppFailureResult;
export type CreateConversationResult = AppResult<{ conversation: Conversation }>;

export interface AddMessageInput {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface AddMessageDeps {
  coreClient: {
    addMessage: (message: Message) => Promise<Message>;
  };
  generateId: () => string;
}

export type AddMessageSuccessResult = AppSuccessResult<{ message: Message }>;
export type AddMessageFailureResult = AppFailureResult;
export type AddMessageResult = AppResult<{ message: Message }>;

export interface GetAllConversationsDeps {
  coreClient: {
    listConversations: () => Promise<Conversation[]>;
  };
}

export type GetConversationsSuccessResult = AppSuccessResult<{
  conversations: Conversation[];
}>;
export type GetConversationsFailureResult = AppFailureResult;
export type GetConversationsResult = AppResult<{ conversations: Conversation[] }>;

export interface GetConversationMessagesDeps {
  coreClient: {
    listConversationMessages: (conversationId: string) => Promise<Message[]>;
  };
}

export type GetMessagesSuccessResult = AppSuccessResult<{ messages: Message[] }>;
export type GetMessagesFailureResult = AppFailureResult;
export type GetMessagesResult = AppResult<{ messages: Message[] }>;

export interface UpdateConversationTitleInput {
  conversationId: string;
  title: string;
}

export interface UpdateConversationTitleDeps {
  coreClient: {
    updateConversation: (
      conversationId: string,
      patch: ConversationPatch
    ) => Promise<Conversation>;
  };
}

export type UpdateTitleSuccessResult = AppSuccessResult<{ conversation: Conversation }>;
export type UpdateTitleFailureResult = AppFailureResult;
export type UpdateTitleResult = AppResult<{ conversation: Conversation }>;

export interface UpdateConversationDetailsInput {
  conversationId: string;
  title?: string | null;
  icon?: string | null;
  contextItemId?: string | null;
}

export interface UpdateConversationDetailsDeps {
  coreClient: {
    updateConversation: (
      conversationId: string,
      patch: ConversationPatch
    ) => Promise<Conversation>;
  };
}

export type UpdateConversationDetailsSuccessResult = AppSuccessResult<{
  conversation: Conversation;
}>;
export type UpdateConversationDetailsFailureResult = AppFailureResult;
export type UpdateConversationDetailsResult = AppResult<{
  conversation: Conversation;
}>;

export interface DeleteConversationInput {
  conversationId: string;
}

export interface DeleteConversationDeps {
  coreClient: {
    deleteConversation: (conversationId: string, deletedAt: number) => Promise<void>;
  };
}

export type DeleteConversationSuccessResult = AppSuccessResult;
export type DeleteConversationFailureResult = AppFailureResult;
export type DeleteConversationResult = AppResult;

export interface UpdateMessageInput {
  messageId: string;
  content: string;
}

export interface UpdateMessageDeps {
  coreClient: {
    updateMessage: (messageId: string, patch: MessagePatch) => Promise<Message>;
  };
}

export type UpdateMessageSuccessResult = AppSuccessResult<{ message: Message }>;
export type UpdateMessageFailureResult = AppFailureResult;
export type UpdateMessageResult = AppResult<{ message: Message }>;

export interface DeleteMessageInput {
  messageId: string;
}

export interface DeleteMessageDeps {
  coreClient: {
    deleteMessage: (messageId: string, deletedAt: number) => Promise<void>;
  };
}

export type DeleteMessageSuccessResult = AppSuccessResult;
export type DeleteMessageFailureResult = AppFailureResult;
export type DeleteMessageResult = AppResult;

// ============================================================================
// Factory Functions
// ============================================================================

export function createCreateConversation(deps: CreateConversationDeps) {
  return async (input: CreateConversationInput): Promise<CreateConversationResult> =>
    runChatAction(async () => {
      const now = Date.now();
      const conversation: Conversation = {
        id: deps.generateId(),
        title: input.title ?? null,
        icon: input.icon ?? null,
        contextItemId: input.contextItemId ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      return {
        conversation: await deps.coreClient.createConversation(conversation),
      };
    });
}

export function createAddMessage(deps: AddMessageDeps) {
  return async (input: AddMessageInput): Promise<AddMessageResult> =>
    runChatAction(async () => {
      const now = Date.now();
      const message: Message = {
        id: deps.generateId(),
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        createdAt: now,
        updatedAt: null,
        deletedAt: null,
      };

      return {
        message: await deps.coreClient.addMessage(message),
      };
    });
}

export function createGetAllConversations(deps: GetAllConversationsDeps) {
  return async (): Promise<GetConversationsResult> =>
    runChatAction(async () => ({
      conversations: await deps.coreClient.listConversations(),
    }));
}

export function createGetConversationMessages(deps: GetConversationMessagesDeps) {
  return async (conversationId: string): Promise<GetMessagesResult> =>
    runChatAction(async () => ({
      messages: await deps.coreClient.listConversationMessages(conversationId),
    }));
}

export function createUpdateConversationTitle(deps: UpdateConversationTitleDeps) {
  return async (input: UpdateConversationTitleInput): Promise<UpdateTitleResult> =>
    runChatAction(async () => ({
      conversation: await deps.coreClient.updateConversation(input.conversationId, {
        title: input.title,
        updatedAt: Date.now(),
      }),
    }));
}

export function createUpdateConversationDetails(deps: UpdateConversationDetailsDeps) {
  return async (
    input: UpdateConversationDetailsInput
  ): Promise<UpdateConversationDetailsResult> =>
    runChatAction(async () => ({
      conversation: await deps.coreClient.updateConversation(input.conversationId, {
        title: input.title,
        icon: input.icon,
        contextItemId: input.contextItemId,
        updatedAt: Date.now(),
      }),
    }));
}

export function createDeleteConversation(deps: DeleteConversationDeps) {
  return async (input: DeleteConversationInput): Promise<DeleteConversationResult> =>
    runChatAction(async () => {
      await deps.coreClient.deleteConversation(input.conversationId, Date.now());
      return {};
    });
}

export function createUpdateMessage(deps: UpdateMessageDeps) {
  return async (input: UpdateMessageInput): Promise<UpdateMessageResult> =>
    runChatAction(async () => ({
      message: await deps.coreClient.updateMessage(input.messageId, {
        content: input.content,
        updatedAt: Date.now(),
      }),
    }));
}

export function createDeleteMessage(deps: DeleteMessageDeps) {
  return async (input: DeleteMessageInput): Promise<DeleteMessageResult> =>
    runChatAction(async () => {
      await deps.coreClient.deleteMessage(input.messageId, Date.now());
      return {};
    });
}
