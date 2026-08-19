import type { AddMessageInput, AddMessageOutput, CalculateNextReviewInput, CalculateNextReviewOutput, CalculateTagOverlapInput, CalculateTagOverlapOutput, CreateConversationInput, CreateConversationOutput, DeleteConversationInput, DeleteConversationOutput, DeleteKnowledgeItemInput, DeleteKnowledgeItemOutput, DeleteMessageInput, DeleteMessageOutput, GetDueKnowledgeItemsInput, GetDueKnowledgeItemsOutput, GetKnowledgeItemByIdInput, GetKnowledgeItemByIdOutput, InitializeCoreInput, InitializeCoreOutput, InitializeReviewScheduleInput, InitializeReviewScheduleOutput, ListConversationMessagesInput, ListConversationMessagesOutput, ListConversationsInput, ListConversationsOutput, ListKnowledgeItemsByIdsInput, ListKnowledgeItemsInput, ListKnowledgeItemsOutput, ListKnowledgeItemsOutputByIds, ListPendingKnowledgeItemsForLabelingInput, ListPendingKnowledgeItemsForLabelingOutput, ListPendingRecommendationsInput, ListPendingRecommendationsOutput, ListRecentFeedbackEventsInput, ListRecentFeedbackEventsOutput, ListRecommendationsInput, ListRecommendationsOutput, ListWeeklyKnowledgeItemsInput, ListWeeklyKnowledgeItemsOutput, LogRecommendationFeedbackInput, LogRecommendationFeedbackOutput, RespondToRecommendationInput, RespondToRecommendationOutput, SaveKnowledgeItemInput, SaveKnowledgeItemOutput, SaveRecommendationsInput, SaveRecommendationsOutput, UpdateConversationInput, UpdateConversationOutput, UpdateKnowledgeItemInput, UpdateKnowledgeItemOutput, UpdateMessageInput, UpdateMessageOutput } from './types.js';
import { invoke } from '@rustra/types';

export function addMessage(input: AddMessageInput): Promise<AddMessageOutput> {
  return invoke<AddMessageOutput>('addMessage', input);
}

export function calculateNextReview(input: CalculateNextReviewInput): Promise<CalculateNextReviewOutput> {
  return invoke<CalculateNextReviewOutput>('calculateNextReview', input);
}

export function calculateTagOverlap(input: CalculateTagOverlapInput): Promise<CalculateTagOverlapOutput> {
  return invoke<CalculateTagOverlapOutput>('calculateTagOverlap', input);
}

export function createConversation(input: CreateConversationInput): Promise<CreateConversationOutput> {
  return invoke<CreateConversationOutput>('createConversation', input);
}

export function deleteConversation(input: DeleteConversationInput): Promise<DeleteConversationOutput> {
  return invoke<DeleteConversationOutput>('deleteConversation', input);
}

export function deleteKnowledgeItem(input: DeleteKnowledgeItemInput): Promise<DeleteKnowledgeItemOutput> {
  return invoke<DeleteKnowledgeItemOutput>('deleteKnowledgeItem', input);
}

export function deleteMessage(input: DeleteMessageInput): Promise<DeleteMessageOutput> {
  return invoke<DeleteMessageOutput>('deleteMessage', input);
}

export function getDueKnowledgeItems(input: GetDueKnowledgeItemsInput): Promise<GetDueKnowledgeItemsOutput> {
  return invoke<GetDueKnowledgeItemsOutput>('getDueKnowledgeItems', input);
}

export function getKnowledgeItemById(input: GetKnowledgeItemByIdInput): Promise<GetKnowledgeItemByIdOutput> {
  return invoke<GetKnowledgeItemByIdOutput>('getKnowledgeItemById', input);
}

export function initializeCore(input: InitializeCoreInput): Promise<InitializeCoreOutput> {
  return invoke<InitializeCoreOutput>('initializeCore', input);
}

export function initializeReviewSchedule(input: InitializeReviewScheduleInput): Promise<InitializeReviewScheduleOutput> {
  return invoke<InitializeReviewScheduleOutput>('initializeReviewSchedule', input);
}

export function listConversationMessages(input: ListConversationMessagesInput): Promise<ListConversationMessagesOutput> {
  return invoke<ListConversationMessagesOutput>('listConversationMessages', input);
}

export function listConversations(input: ListConversationsInput): Promise<ListConversationsOutput> {
  return invoke<ListConversationsOutput>('listConversations', input);
}

export function listKnowledgeItems(input: ListKnowledgeItemsInput): Promise<ListKnowledgeItemsOutput> {
  return invoke<ListKnowledgeItemsOutput>('listKnowledgeItems', input);
}

export function listKnowledgeItemsByIds(input: ListKnowledgeItemsByIdsInput): Promise<ListKnowledgeItemsOutputByIds> {
  return invoke<ListKnowledgeItemsOutputByIds>('listKnowledgeItemsByIds', input);
}

export function listPendingKnowledgeItemsForLabeling(input: ListPendingKnowledgeItemsForLabelingInput): Promise<ListPendingKnowledgeItemsForLabelingOutput> {
  return invoke<ListPendingKnowledgeItemsForLabelingOutput>('listPendingKnowledgeItemsForLabeling', input);
}

export function listPendingRecommendations(input: ListPendingRecommendationsInput): Promise<ListPendingRecommendationsOutput> {
  return invoke<ListPendingRecommendationsOutput>('listPendingRecommendations', input);
}

export function listRecentFeedbackEvents(input: ListRecentFeedbackEventsInput): Promise<ListRecentFeedbackEventsOutput> {
  return invoke<ListRecentFeedbackEventsOutput>('listRecentFeedbackEvents', input);
}

export function listRecommendations(input: ListRecommendationsInput): Promise<ListRecommendationsOutput> {
  return invoke<ListRecommendationsOutput>('listRecommendations', input);
}

export function listWeeklyKnowledgeItems(input: ListWeeklyKnowledgeItemsInput): Promise<ListWeeklyKnowledgeItemsOutput> {
  return invoke<ListWeeklyKnowledgeItemsOutput>('listWeeklyKnowledgeItems', input);
}

export function logRecommendationFeedback(input: LogRecommendationFeedbackInput): Promise<LogRecommendationFeedbackOutput> {
  return invoke<LogRecommendationFeedbackOutput>('logRecommendationFeedback', input);
}

export function respondToRecommendation(input: RespondToRecommendationInput): Promise<RespondToRecommendationOutput> {
  return invoke<RespondToRecommendationOutput>('respondToRecommendation', input);
}

export function saveKnowledgeItem(input: SaveKnowledgeItemInput): Promise<SaveKnowledgeItemOutput> {
  return invoke<SaveKnowledgeItemOutput>('saveKnowledgeItem', input);
}

export function saveRecommendations(input: SaveRecommendationsInput): Promise<SaveRecommendationsOutput> {
  return invoke<SaveRecommendationsOutput>('saveRecommendations', input);
}

export function updateConversation(input: UpdateConversationInput): Promise<UpdateConversationOutput> {
  return invoke<UpdateConversationOutput>('updateConversation', input);
}

export function updateKnowledgeItem(input: UpdateKnowledgeItemInput): Promise<UpdateKnowledgeItemOutput> {
  return invoke<UpdateKnowledgeItemOutput>('updateKnowledgeItem', input);
}

export function updateMessage(input: UpdateMessageInput): Promise<UpdateMessageOutput> {
  return invoke<UpdateMessageOutput>('updateMessage', input);
}

