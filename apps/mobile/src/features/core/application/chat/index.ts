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

function toAppError(error: unknown): AppError {
  return {
    code: 'CHAT_ERROR',
    message: error instanceof Error ? error.message : String(error),
  };
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

export interface CreateConversationSuccessResult {
  success: true;
  conversation: Conversation;
}

export interface CreateConversationFailureResult {
  success: false;
  error: AppError;
}

export type CreateConversationResult =
  | CreateConversationSuccessResult
  | CreateConversationFailureResult;

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

export interface AddMessageSuccessResult {
  success: true;
  message: Message;
}

export interface AddMessageFailureResult {
  success: false;
  error: AppError;
}

export type AddMessageResult = AddMessageSuccessResult | AddMessageFailureResult;

export interface GetAllConversationsDeps {
  coreClient: {
    listConversations: () => Promise<Conversation[]>;
  };
}

export interface GetConversationsSuccessResult {
  success: true;
  conversations: Conversation[];
}

export interface GetConversationsFailureResult {
  success: false;
  error: AppError;
}

export type GetConversationsResult =
  | GetConversationsSuccessResult
  | GetConversationsFailureResult;

export interface GetConversationMessagesDeps {
  coreClient: {
    listConversationMessages: (conversationId: string) => Promise<Message[]>;
  };
}

export interface GetMessagesSuccessResult {
  success: true;
  messages: Message[];
}

export interface GetMessagesFailureResult {
  success: false;
  error: AppError;
}

export type GetMessagesResult = GetMessagesSuccessResult | GetMessagesFailureResult;

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

export interface UpdateTitleSuccessResult {
  success: true;
  conversation: Conversation;
}

export interface UpdateTitleFailureResult {
  success: false;
  error: AppError;
}

export type UpdateTitleResult = UpdateTitleSuccessResult | UpdateTitleFailureResult;

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

export interface UpdateConversationDetailsSuccessResult {
  success: true;
  conversation: Conversation;
}

export interface UpdateConversationDetailsFailureResult {
  success: false;
  error: AppError;
}

export type UpdateConversationDetailsResult =
  | UpdateConversationDetailsSuccessResult
  | UpdateConversationDetailsFailureResult;

export interface DeleteConversationInput {
  conversationId: string;
}

export interface DeleteConversationDeps {
  coreClient: {
    deleteConversation: (conversationId: string, deletedAt: number) => Promise<void>;
  };
}

export interface DeleteConversationSuccessResult {
  success: true;
}

export interface DeleteConversationFailureResult {
  success: false;
  error: AppError;
}

export type DeleteConversationResult =
  | DeleteConversationSuccessResult
  | DeleteConversationFailureResult;

export interface UpdateMessageInput {
  messageId: string;
  content: string;
}

export interface UpdateMessageDeps {
  coreClient: {
    updateMessage: (messageId: string, patch: MessagePatch) => Promise<Message>;
  };
}

export interface UpdateMessageSuccessResult {
  success: true;
  message: Message;
}

export interface UpdateMessageFailureResult {
  success: false;
  error: AppError;
}

export type UpdateMessageResult = UpdateMessageSuccessResult | UpdateMessageFailureResult;

export interface DeleteMessageInput {
  messageId: string;
}

export interface DeleteMessageDeps {
  coreClient: {
    deleteMessage: (messageId: string, deletedAt: number) => Promise<void>;
  };
}

export interface DeleteMessageSuccessResult {
  success: true;
}

export interface DeleteMessageFailureResult {
  success: false;
  error: AppError;
}

export type DeleteMessageResult = DeleteMessageSuccessResult | DeleteMessageFailureResult;

// ============================================================================
// Factory Functions
// ============================================================================

export function createCreateConversation(deps: CreateConversationDeps) {
  return async (input: CreateConversationInput): Promise<CreateConversationResult> => {
    try {
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

      const saved = await deps.coreClient.createConversation(conversation);
      return { success: true, conversation: saved };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createAddMessage(deps: AddMessageDeps) {
  return async (input: AddMessageInput): Promise<AddMessageResult> => {
    try {
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

      const saved = await deps.coreClient.addMessage(message);
      return { success: true, message: saved };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createGetAllConversations(deps: GetAllConversationsDeps) {
  return async (): Promise<GetConversationsResult> => {
    try {
      const conversations = await deps.coreClient.listConversations();
      return { success: true, conversations };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createGetConversationMessages(deps: GetConversationMessagesDeps) {
  return async (conversationId: string): Promise<GetMessagesResult> => {
    try {
      const messages = await deps.coreClient.listConversationMessages(conversationId);
      return { success: true, messages };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createUpdateConversationTitle(deps: UpdateConversationTitleDeps) {
  return async (input: UpdateConversationTitleInput): Promise<UpdateTitleResult> => {
    try {
      const conversation = await deps.coreClient.updateConversation(input.conversationId, {
        title: input.title,
        updatedAt: Date.now(),
      });
      return { success: true, conversation };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createUpdateConversationDetails(deps: UpdateConversationDetailsDeps) {
  return async (input: UpdateConversationDetailsInput): Promise<UpdateConversationDetailsResult> => {
    try {
      const conversation = await deps.coreClient.updateConversation(input.conversationId, {
        title: input.title,
        icon: input.icon,
        contextItemId: input.contextItemId,
        updatedAt: Date.now(),
      });
      return { success: true, conversation };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createDeleteConversation(deps: DeleteConversationDeps) {
  return async (input: DeleteConversationInput): Promise<DeleteConversationResult> => {
    try {
      await deps.coreClient.deleteConversation(input.conversationId, Date.now());
      return { success: true };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createUpdateMessage(deps: UpdateMessageDeps) {
  return async (input: UpdateMessageInput): Promise<UpdateMessageResult> => {
    try {
      const message = await deps.coreClient.updateMessage(input.messageId, {
        content: input.content,
        updatedAt: Date.now(),
      });
      return { success: true, message };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createDeleteMessage(deps: DeleteMessageDeps) {
  return async (input: DeleteMessageInput): Promise<DeleteMessageResult> => {
    try {
      await deps.coreClient.deleteMessage(input.messageId, Date.now());
      return { success: true };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}
