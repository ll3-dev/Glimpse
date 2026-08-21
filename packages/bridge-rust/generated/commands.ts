import type { AddMessageInput, AddMessageOutput, CalculateNextReviewInput, CalculateNextReviewOutput, CalculateTagOverlapInput, CalculateTagOverlapOutput, CreateConversationInput, CreateConversationOutput, DeleteAllDataInput, DeleteAllDataOutput, DeleteConversationInput, DeleteConversationOutput, DeleteKnowledgeItemInput, DeleteKnowledgeItemOutput, DeleteMessageInput, DeleteMessageOutput, ExportDataInput, ExportDataOutput, GetDueKnowledgeItemsInput, GetDueKnowledgeItemsOutput, GetKnowledgeItemByIdInput, GetKnowledgeItemByIdOutput, ImportDataInput, ImportDataOutput, InitializeCoreInput, InitializeCoreOutput, InitializeReviewScheduleInput, InitializeReviewScheduleOutput, ListConversationMessagesInput, ListConversationMessagesOutput, ListConversationsInput, ListConversationsOutput, ListKnowledgeItemsByIdsInput, ListKnowledgeItemsInput, ListKnowledgeItemsOutput, ListKnowledgeItemsOutputByIds, ListPendingKnowledgeItemsForLabelingInput, ListPendingKnowledgeItemsForLabelingOutput, ListPendingRecommendationsInput, ListPendingRecommendationsOutput, ListRecentFeedbackEventsInput, ListRecentFeedbackEventsOutput, ListRecommendationsInput, ListRecommendationsOutput, ListWeeklyKnowledgeItemsInput, ListWeeklyKnowledgeItemsOutput, LogRecommendationFeedbackInput, LogRecommendationFeedbackOutput, RespondToRecommendationInput, RespondToRecommendationOutput, SaveKnowledgeItemInput, SaveKnowledgeItemOutput, SaveRecommendationsInput, SaveRecommendationsOutput, UpdateConversationInput, UpdateConversationOutput, UpdateKnowledgeItemInput, UpdateKnowledgeItemOutput, UpdateMessageInput, UpdateMessageOutput } from './types.js';
import { invoke } from '@rustra/types';
import type { InvokeOptions } from '@rustra/types';

export function addMessage(input: AddMessageInput, options?: InvokeOptions): Promise<AddMessageOutput> {
  return invoke<AddMessageOutput>('addMessage', input, options);
}

export function calculateNextReview(input: CalculateNextReviewInput, options?: InvokeOptions): Promise<CalculateNextReviewOutput> {
  return invoke<CalculateNextReviewOutput>('calculateNextReview', input, options);
}

export function calculateTagOverlap(input: CalculateTagOverlapInput, options?: InvokeOptions): Promise<CalculateTagOverlapOutput> {
  return invoke<CalculateTagOverlapOutput>('calculateTagOverlap', input, options);
}

export function createConversation(input: CreateConversationInput, options?: InvokeOptions): Promise<CreateConversationOutput> {
  return invoke<CreateConversationOutput>('createConversation', input, options);
}

export function deleteAllData(input: DeleteAllDataInput, options?: InvokeOptions): Promise<DeleteAllDataOutput> {
  return invoke<DeleteAllDataOutput>('deleteAllData', input, options);
}

export function deleteConversation(input: DeleteConversationInput, options?: InvokeOptions): Promise<DeleteConversationOutput> {
  return invoke<DeleteConversationOutput>('deleteConversation', input, options);
}

export function deleteKnowledgeItem(input: DeleteKnowledgeItemInput, options?: InvokeOptions): Promise<DeleteKnowledgeItemOutput> {
  return invoke<DeleteKnowledgeItemOutput>('deleteKnowledgeItem', input, options);
}

export function deleteMessage(input: DeleteMessageInput, options?: InvokeOptions): Promise<DeleteMessageOutput> {
  return invoke<DeleteMessageOutput>('deleteMessage', input, options);
}

export function exportData(input: ExportDataInput, options?: InvokeOptions): Promise<ExportDataOutput> {
  return invoke<ExportDataOutput>('exportData', input, options);
}

export function getDueKnowledgeItems(input: GetDueKnowledgeItemsInput, options?: InvokeOptions): Promise<GetDueKnowledgeItemsOutput> {
  return invoke<GetDueKnowledgeItemsOutput>('getDueKnowledgeItems', input, options);
}

export function getKnowledgeItemById(input: GetKnowledgeItemByIdInput, options?: InvokeOptions): Promise<GetKnowledgeItemByIdOutput> {
  return invoke<GetKnowledgeItemByIdOutput>('getKnowledgeItemById', input, options);
}

export function importData(input: ImportDataInput, options?: InvokeOptions): Promise<ImportDataOutput> {
  return invoke<ImportDataOutput>('importData', input, options);
}

export function initializeCore(input: InitializeCoreInput, options?: InvokeOptions): Promise<InitializeCoreOutput> {
  return invoke<InitializeCoreOutput>('initializeCore', input, options);
}

export function initializeReviewSchedule(input: InitializeReviewScheduleInput, options?: InvokeOptions): Promise<InitializeReviewScheduleOutput> {
  return invoke<InitializeReviewScheduleOutput>('initializeReviewSchedule', input, options);
}

export function listConversationMessages(input: ListConversationMessagesInput, options?: InvokeOptions): Promise<ListConversationMessagesOutput> {
  return invoke<ListConversationMessagesOutput>('listConversationMessages', input, options);
}

export function listConversations(input: ListConversationsInput, options?: InvokeOptions): Promise<ListConversationsOutput> {
  return invoke<ListConversationsOutput>('listConversations', input, options);
}

export function listKnowledgeItems(input: ListKnowledgeItemsInput, options?: InvokeOptions): Promise<ListKnowledgeItemsOutput> {
  return invoke<ListKnowledgeItemsOutput>('listKnowledgeItems', input, options);
}

export function listKnowledgeItemsByIds(input: ListKnowledgeItemsByIdsInput, options?: InvokeOptions): Promise<ListKnowledgeItemsOutputByIds> {
  return invoke<ListKnowledgeItemsOutputByIds>('listKnowledgeItemsByIds', input, options);
}

export function listPendingKnowledgeItemsForLabeling(input: ListPendingKnowledgeItemsForLabelingInput, options?: InvokeOptions): Promise<ListPendingKnowledgeItemsForLabelingOutput> {
  return invoke<ListPendingKnowledgeItemsForLabelingOutput>('listPendingKnowledgeItemsForLabeling', input, options);
}

export function listPendingRecommendations(input: ListPendingRecommendationsInput, options?: InvokeOptions): Promise<ListPendingRecommendationsOutput> {
  return invoke<ListPendingRecommendationsOutput>('listPendingRecommendations', input, options);
}

export function listRecentFeedbackEvents(input: ListRecentFeedbackEventsInput, options?: InvokeOptions): Promise<ListRecentFeedbackEventsOutput> {
  return invoke<ListRecentFeedbackEventsOutput>('listRecentFeedbackEvents', input, options);
}

export function listRecommendations(input: ListRecommendationsInput, options?: InvokeOptions): Promise<ListRecommendationsOutput> {
  return invoke<ListRecommendationsOutput>('listRecommendations', input, options);
}

export function listWeeklyKnowledgeItems(input: ListWeeklyKnowledgeItemsInput, options?: InvokeOptions): Promise<ListWeeklyKnowledgeItemsOutput> {
  return invoke<ListWeeklyKnowledgeItemsOutput>('listWeeklyKnowledgeItems', input, options);
}

export function logRecommendationFeedback(input: LogRecommendationFeedbackInput, options?: InvokeOptions): Promise<LogRecommendationFeedbackOutput> {
  return invoke<LogRecommendationFeedbackOutput>('logRecommendationFeedback', input, options);
}

export function respondToRecommendation(input: RespondToRecommendationInput, options?: InvokeOptions): Promise<RespondToRecommendationOutput> {
  return invoke<RespondToRecommendationOutput>('respondToRecommendation', input, options);
}

export function saveKnowledgeItem(input: SaveKnowledgeItemInput, options?: InvokeOptions): Promise<SaveKnowledgeItemOutput> {
  return invoke<SaveKnowledgeItemOutput>('saveKnowledgeItem', input, options);
}

export function saveRecommendations(input: SaveRecommendationsInput, options?: InvokeOptions): Promise<SaveRecommendationsOutput> {
  return invoke<SaveRecommendationsOutput>('saveRecommendations', input, options);
}

export function updateConversation(input: UpdateConversationInput, options?: InvokeOptions): Promise<UpdateConversationOutput> {
  return invoke<UpdateConversationOutput>('updateConversation', input, options);
}

export function updateKnowledgeItem(input: UpdateKnowledgeItemInput, options?: InvokeOptions): Promise<UpdateKnowledgeItemOutput> {
  return invoke<UpdateKnowledgeItemOutput>('updateKnowledgeItem', input, options);
}

export function updateMessage(input: UpdateMessageInput, options?: InvokeOptions): Promise<UpdateMessageOutput> {
  return invoke<UpdateMessageOutput>('updateMessage', input, options);
}

export { configure as configureRustraEngine } from '@rustra/types';
