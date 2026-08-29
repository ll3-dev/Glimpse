import type { AddMessageInput, AddMessageOutput, CalculateTagOverlapInput, CalculateTagOverlapOutput, CreateConversationInput, CreateConversationOutput, DeleteAllDataInput, DeleteAllDataOutput, DeleteConversationInput, DeleteConversationOutput, DeleteKnowledgeItemInput, DeleteKnowledgeItemOutput, DeleteMessageInput, DeleteMessageOutput, ExportDataInput, ExportDataOutput, GetDueKnowledgeItemsInput, GetDueKnowledgeItemsOutput, GetKnowledgeItemByIdInput, GetKnowledgeItemByIdOutput, ImportDataInput, ImportDataOutput, InitializeCoreInput, InitializeCoreOutput, InitializeReviewScheduleInput, InitializeReviewScheduleOutput, ListConversationMessagesInput, ListConversationMessagesOutput, ListConversationsInput, ListConversationsOutput, ListKnowledgeItemsByIdsInput, ListKnowledgeItemsInput, ListKnowledgeItemsOutput, ListKnowledgeItemsOutputByIds, ListPendingKnowledgeItemsForLabelingInput, ListPendingKnowledgeItemsForLabelingOutput, ListPendingRecommendationsInput, ListPendingRecommendationsOutput, ListRecentFeedbackEventsInput, ListRecentFeedbackEventsOutput, ListRecommendationsInput, ListRecommendationsOutput, ListWeeklyKnowledgeItemsInput, ListWeeklyKnowledgeItemsOutput, LogRecommendationFeedbackInput, LogRecommendationFeedbackOutput, MergeDataInput, MergeDataOutput, MergeDeltaInput, MergeDeltaOutput, RespondToRecommendationInput, RespondToRecommendationOutput, SaveKnowledgeItemInput, SaveKnowledgeItemOutput, SaveRecommendationsInput, SaveRecommendationsOutput, UpdateConversationInput, UpdateConversationOutput, UpdateKnowledgeItemInput, UpdateKnowledgeItemOutput, UpdateMessageInput, UpdateMessageOutput } from './types.js';
import { createGeneratedFields2, invokeGenerated, invokeGeneratedFields1 } from '@rustra/types';
import type { InvokeOptions } from '@rustra/types';

export function addMessage(input: AddMessageInput, options?: InvokeOptions): Promise<AddMessageOutput> {
  return invokeGenerated<AddMessageOutput>(22, 'addMessage', input, options);
}
addMessage.commandId = 'addMessage';

export function calculateTagOverlap(input: CalculateTagOverlapInput, options?: InvokeOptions): Promise<CalculateTagOverlapOutput> {
  return invokeGenerated<CalculateTagOverlapOutput>(29, 'calculateTagOverlap', input, options);
}
calculateTagOverlap.commandId = 'calculateTagOverlap';

export function createConversation(input: CreateConversationInput, options?: InvokeOptions): Promise<CreateConversationOutput> {
  return invokeGenerated<CreateConversationOutput>(1, 'createConversation', input, options);
}
createConversation.commandId = 'createConversation';

export function deleteAllData(input: DeleteAllDataInput, options?: InvokeOptions): Promise<DeleteAllDataOutput> {
  return invokeGenerated<DeleteAllDataOutput>(9, 'deleteAllData', input, options);
}
deleteAllData.commandId = 'deleteAllData';

export const deleteConversation = createGeneratedFields2<DeleteConversationInput, DeleteConversationOutput>(4, 'deleteConversation', "conversationId", "deletedAt", 'deleteConversation');

export function deleteKnowledgeItem(input: DeleteKnowledgeItemInput, options?: InvokeOptions): Promise<DeleteKnowledgeItemOutput> {
  return invokeGeneratedFields1<DeleteKnowledgeItemOutput>(16, 'deleteKnowledgeItem', input, input["itemId"], options);
}
deleteKnowledgeItem.commandId = 'deleteKnowledgeItem';

export const deleteMessage = createGeneratedFields2<DeleteMessageInput, DeleteMessageOutput>(24, 'deleteMessage', "messageId", "deletedAt", 'deleteMessage');

export function exportData(input: ExportDataInput, options?: InvokeOptions): Promise<ExportDataOutput> {
  return invokeGenerated<ExportDataOutput>(5, 'exportData', input, options);
}
exportData.commandId = 'exportData';

export function getDueKnowledgeItems(input: GetDueKnowledgeItemsInput, options?: InvokeOptions): Promise<GetDueKnowledgeItemsOutput> {
  return invokeGenerated<GetDueKnowledgeItemsOutput>(20, 'getDueKnowledgeItems', input, options);
}
getDueKnowledgeItems.commandId = 'getDueKnowledgeItems';

export function getKnowledgeItemById(input: GetKnowledgeItemByIdInput, options?: InvokeOptions): Promise<GetKnowledgeItemByIdOutput> {
  return invokeGeneratedFields1<GetKnowledgeItemByIdOutput>(14, 'getKnowledgeItemById', input, input["itemId"], options);
}
getKnowledgeItemById.commandId = 'getKnowledgeItemById';

export function importData(input: ImportDataInput, options?: InvokeOptions): Promise<ImportDataOutput> {
  return invokeGeneratedFields1<ImportDataOutput>(6, 'importData', input, input["dataJson"], options);
}
importData.commandId = 'importData';

export function initializeCore(input: InitializeCoreInput, options?: InvokeOptions): Promise<InitializeCoreOutput> {
  return invokeGeneratedFields1<InitializeCoreOutput>(31, 'initializeCore', input, input["dbPath"], options);
}
initializeCore.commandId = 'initializeCore';

export function initializeReviewSchedule(input: InitializeReviewScheduleInput, options?: InvokeOptions): Promise<InitializeReviewScheduleOutput> {
  return invokeGenerated<InitializeReviewScheduleOutput>(30, 'initializeReviewSchedule', input, options);
}
initializeReviewSchedule.commandId = 'initializeReviewSchedule';

export function listConversationMessages(input: ListConversationMessagesInput, options?: InvokeOptions): Promise<ListConversationMessagesOutput> {
  return invokeGeneratedFields1<ListConversationMessagesOutput>(21, 'listConversationMessages', input, input["conversationId"], options);
}
listConversationMessages.commandId = 'listConversationMessages';

export function listConversations(input: ListConversationsInput, options?: InvokeOptions): Promise<ListConversationsOutput> {
  return invokeGenerated<ListConversationsOutput>(2, 'listConversations', input, options);
}
listConversations.commandId = 'listConversations';

export function listKnowledgeItems(input: ListKnowledgeItemsInput, options?: InvokeOptions): Promise<ListKnowledgeItemsOutput> {
  return invokeGenerated<ListKnowledgeItemsOutput>(13, 'listKnowledgeItems', input, options);
}
listKnowledgeItems.commandId = 'listKnowledgeItems';

export function listKnowledgeItemsByIds(input: ListKnowledgeItemsByIdsInput, options?: InvokeOptions): Promise<ListKnowledgeItemsOutputByIds> {
  return invokeGenerated<ListKnowledgeItemsOutputByIds>(17, 'listKnowledgeItemsByIds', input, options);
}
listKnowledgeItemsByIds.commandId = 'listKnowledgeItemsByIds';

export function listPendingKnowledgeItemsForLabeling(input: ListPendingKnowledgeItemsForLabelingInput, options?: InvokeOptions): Promise<ListPendingKnowledgeItemsForLabelingOutput> {
  return invokeGeneratedFields1<ListPendingKnowledgeItemsForLabelingOutput>(19, 'listPendingKnowledgeItemsForLabeling', input, input["limit"], options);
}
listPendingKnowledgeItemsForLabeling.commandId = 'listPendingKnowledgeItemsForLabeling';

export function listPendingRecommendations(input: ListPendingRecommendationsInput, options?: InvokeOptions): Promise<ListPendingRecommendationsOutput> {
  return invokeGenerated<ListPendingRecommendationsOutput>(27, 'listPendingRecommendations', input, options);
}
listPendingRecommendations.commandId = 'listPendingRecommendations';

export function listRecentFeedbackEvents(input: ListRecentFeedbackEventsInput, options?: InvokeOptions): Promise<ListRecentFeedbackEventsOutput> {
  return invokeGeneratedFields1<ListRecentFeedbackEventsOutput>(10, 'listRecentFeedbackEvents', input, input["limit"], options);
}
listRecentFeedbackEvents.commandId = 'listRecentFeedbackEvents';

export function listRecommendations(input: ListRecommendationsInput, options?: InvokeOptions): Promise<ListRecommendationsOutput> {
  return invokeGenerated<ListRecommendationsOutput>(26, 'listRecommendations', input, options);
}
listRecommendations.commandId = 'listRecommendations';

export function listWeeklyKnowledgeItems(input: ListWeeklyKnowledgeItemsInput, options?: InvokeOptions): Promise<ListWeeklyKnowledgeItemsOutput> {
  return invokeGeneratedFields1<ListWeeklyKnowledgeItemsOutput>(18, 'listWeeklyKnowledgeItems', input, input["since"], options);
}
listWeeklyKnowledgeItems.commandId = 'listWeeklyKnowledgeItems';

export function logRecommendationFeedback(input: LogRecommendationFeedbackInput, options?: InvokeOptions): Promise<LogRecommendationFeedbackOutput> {
  return invokeGenerated<LogRecommendationFeedbackOutput>(11, 'logRecommendationFeedback', input, options);
}
logRecommendationFeedback.commandId = 'logRecommendationFeedback';

export function mergeData(input: MergeDataInput, options?: InvokeOptions): Promise<MergeDataOutput> {
  return invokeGeneratedFields1<MergeDataOutput>(7, 'mergeData', input, input["dataJson"], options);
}
mergeData.commandId = 'mergeData';

export function mergeDelta(input: MergeDeltaInput, options?: InvokeOptions): Promise<MergeDeltaOutput> {
  return invokeGeneratedFields1<MergeDeltaOutput>(8, 'mergeDelta', input, input["dataJson"], options);
}
mergeDelta.commandId = 'mergeDelta';

export function respondToRecommendation(input: RespondToRecommendationInput, options?: InvokeOptions): Promise<RespondToRecommendationOutput> {
  return invokeGenerated<RespondToRecommendationOutput>(28, 'respondToRecommendation', input, options);
}
respondToRecommendation.commandId = 'respondToRecommendation';

export function saveKnowledgeItem(input: SaveKnowledgeItemInput, options?: InvokeOptions): Promise<SaveKnowledgeItemOutput> {
  return invokeGenerated<SaveKnowledgeItemOutput>(12, 'saveKnowledgeItem', input, options);
}
saveKnowledgeItem.commandId = 'saveKnowledgeItem';

export function saveRecommendations(input: SaveRecommendationsInput, options?: InvokeOptions): Promise<SaveRecommendationsOutput> {
  return invokeGenerated<SaveRecommendationsOutput>(25, 'saveRecommendations', input, options);
}
saveRecommendations.commandId = 'saveRecommendations';

export function updateConversation(input: UpdateConversationInput, options?: InvokeOptions): Promise<UpdateConversationOutput> {
  return invokeGenerated<UpdateConversationOutput>(3, 'updateConversation', input, options);
}
updateConversation.commandId = 'updateConversation';

export function updateKnowledgeItem(input: UpdateKnowledgeItemInput, options?: InvokeOptions): Promise<UpdateKnowledgeItemOutput> {
  return invokeGenerated<UpdateKnowledgeItemOutput>(15, 'updateKnowledgeItem', input, options);
}
updateKnowledgeItem.commandId = 'updateKnowledgeItem';

export function updateMessage(input: UpdateMessageInput, options?: InvokeOptions): Promise<UpdateMessageOutput> {
  return invokeGenerated<UpdateMessageOutput>(23, 'updateMessage', input, options);
}
updateMessage.commandId = 'updateMessage';

export { configure as configureRustraEngine } from '@rustra/types';
