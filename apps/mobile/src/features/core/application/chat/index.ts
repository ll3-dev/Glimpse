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
  ok: true;
  conversation: Conversation;
}

export interface CreateConversationFailureResult {
  ok: false;
  error: string;
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
  ok: true;
  message: Message;
}

export interface AddMessageFailureResult {
  ok: false;
  error: string;
}

export type AddMessageResult = AddMessageSuccessResult | AddMessageFailureResult;

export interface GetAllConversationsDeps {
  coreClient: {
    listConversations: () => Promise<Conversation[]>;
  };
}

export interface GetConversationsSuccessResult {
  ok: true;
  conversations: Conversation[];
}

export interface GetConversationsFailureResult {
  ok: false;
  error: string;
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
  ok: true;
  messages: Message[];
}

export interface GetMessagesFailureResult {
  ok: false;
  error: string;
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
  ok: true;
  conversation: Conversation;
}

export interface UpdateTitleFailureResult {
  ok: false;
  error: string;
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
  ok: true;
  conversation: Conversation;
}

export interface UpdateConversationDetailsFailureResult {
  ok: false;
  error: string;
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
  ok: true;
}

export interface DeleteConversationFailureResult {
  ok: false;
  error: string;
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
  ok: true;
  message: Message;
}

export interface UpdateMessageFailureResult {
  ok: false;
  error: string;
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
  ok: true;
}

export interface DeleteMessageFailureResult {
  ok: false;
  error: string;
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
      return { ok: true, conversation: saved };
    } catch (error) {
      return { ok: false, error: String(error) };
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
      return { ok: true, message: saved };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  };
}

export function createGetAllConversations(deps: GetAllConversationsDeps) {
  return async (): Promise<GetConversationsResult> => {
    try {
      const conversations = await deps.coreClient.listConversations();
      return { ok: true, conversations };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  };
}

export function createGetConversationMessages(deps: GetConversationMessagesDeps) {
  return async (conversationId: string): Promise<GetMessagesResult> => {
    try {
      const messages = await deps.coreClient.listConversationMessages(conversationId);
      return { ok: true, messages };
    } catch (error) {
      return { ok: false, error: String(error) };
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
      return { ok: true, conversation };
    } catch (error) {
      return { ok: false, error: String(error) };
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
      return { ok: true, conversation };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  };
}

export function createDeleteConversation(deps: DeleteConversationDeps) {
  return async (input: DeleteConversationInput): Promise<DeleteConversationResult> => {
    try {
      await deps.coreClient.deleteConversation(input.conversationId, Date.now());
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
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
      return { ok: true, message };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  };
}

export function createDeleteMessage(deps: DeleteMessageDeps) {
  return async (input: DeleteMessageInput): Promise<DeleteMessageResult> => {
    try {
      await deps.coreClient.deleteMessage(input.messageId, Date.now());
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  };
}
