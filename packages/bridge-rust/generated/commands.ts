import type { AddMessageInput, AddMessageOutput, CalculateTagOverlapInput, CalculateTagOverlapOutput, CreateConversationInput, CreateConversationOutput, DeleteAllDataInput, DeleteAllDataOutput, DeleteConversationInput, DeleteConversationOutput, DeleteKnowledgeItemInput, DeleteKnowledgeItemOutput, DeleteMessageInput, DeleteMessageOutput, ExportDataInput, ExportDataOutput, ExportDeltaInput, ExportDeltaOutput, GetDueKnowledgeItemsInput, GetDueKnowledgeItemsOutput, GetKnowledgeItemByIdInput, GetKnowledgeItemByIdOutput, ImportDataInput, ImportDataOutput, InitializeCoreInput, InitializeCoreOutput, InitializeReviewScheduleInput, InitializeReviewScheduleOutput, ListConversationMessagesInput, ListConversationMessagesOutput, ListConversationsInput, ListConversationsOutput, ListKnowledgeItemsByIdsInput, ListKnowledgeItemsInput, ListKnowledgeItemsOutput, ListKnowledgeItemsOutputByIds, ListPendingKnowledgeItemsForLabelingInput, ListPendingKnowledgeItemsForLabelingOutput, ListPendingRecommendationsInput, ListPendingRecommendationsOutput, ListRecentFeedbackEventsInput, ListRecentFeedbackEventsOutput, ListRecommendationsInput, ListRecommendationsOutput, ListWeeklyKnowledgeItemsInput, ListWeeklyKnowledgeItemsOutput, LogRecommendationFeedbackInput, LogRecommendationFeedbackOutput, MergeDataInput, MergeDataOutput, MergeDeltaInput, MergeDeltaOutput, RespondToRecommendationInput, RespondToRecommendationOutput, SaveKnowledgeItemInput, SaveKnowledgeItemOutput, SaveRecommendationsInput, SaveRecommendationsOutput, SyncDataRevisionInput, SyncDataRevisionOutput, SyncDiscoverInput, SyncDiscoverOutput, UpdateConversationInput, UpdateConversationOutput, UpdateKnowledgeItemInput, UpdateKnowledgeItemOutput, UpdateMessageInput, UpdateMessageOutput } from './types.js';
import { createGeneratedFields2, invokeGenerated, invokeGeneratedFields1 } from '@rustra/types';
import type { InvokeOptions } from '@rustra/types';

export function addMessage(input: AddMessageInput, options?: InvokeOptions): Promise<AddMessageOutput> {
  return invokeGenerated<AddMessageOutput>(24, 'addMessage', input, options);
}
addMessage.commandId = 'addMessage';

export function calculateTagOverlap(input: CalculateTagOverlapInput, options?: InvokeOptions): Promise<CalculateTagOverlapOutput> {
  return invokeGenerated<CalculateTagOverlapOutput>(31, 'calculateTagOverlap', input, options);
}
calculateTagOverlap.commandId = 'calculateTagOverlap';

export function createConversation(input: CreateConversationInput, options?: InvokeOptions): Promise<CreateConversationOutput> {
  return invokeGenerated<CreateConversationOutput>(1, 'createConversation', input, options);
}
createConversation.commandId = 'createConversation';

export function deleteAllData(input: DeleteAllDataInput, options?: InvokeOptions): Promise<DeleteAllDataOutput> {
  return invokeGenerated<DeleteAllDataOutput>(11, 'deleteAllData', input, options);
}
deleteAllData.commandId = 'deleteAllData';

export const deleteConversation = createGeneratedFields2<DeleteConversationInput, DeleteConversationOutput>(4, 'deleteConversation', "conversationId", "deletedAt", 'deleteConversation');

export function deleteKnowledgeItem(input: DeleteKnowledgeItemInput, options?: InvokeOptions): Promise<DeleteKnowledgeItemOutput> {
  return invokeGeneratedFields1<DeleteKnowledgeItemOutput>(18, 'deleteKnowledgeItem', input, input["itemId"], options);
}
deleteKnowledgeItem.commandId = 'deleteKnowledgeItem';

export const deleteMessage = createGeneratedFields2<DeleteMessageInput, DeleteMessageOutput>(26, 'deleteMessage', "messageId", "deletedAt", 'deleteMessage');

export function exportData(input: ExportDataInput, options?: InvokeOptions): Promise<ExportDataOutput> {
  return invokeGenerated<ExportDataOutput>(5, 'exportData', input, options);
}
exportData.commandId = 'exportData';

export function exportDelta(input: ExportDeltaInput, options?: InvokeOptions): Promise<ExportDeltaOutput> {
  return invokeGeneratedFields1<ExportDeltaOutput>(6, 'exportDelta', input, input["sinceClockMs"], options);
}
exportDelta.commandId = 'exportDelta';

export function getDueKnowledgeItems(input: GetDueKnowledgeItemsInput, options?: InvokeOptions): Promise<GetDueKnowledgeItemsOutput> {
  return invokeGenerated<GetDueKnowledgeItemsOutput>(22, 'getDueKnowledgeItems', input, options);
}
getDueKnowledgeItems.commandId = 'getDueKnowledgeItems';

export function getKnowledgeItemById(input: GetKnowledgeItemByIdInput, options?: InvokeOptions): Promise<GetKnowledgeItemByIdOutput> {
  return invokeGeneratedFields1<GetKnowledgeItemByIdOutput>(16, 'getKnowledgeItemById', input, input["itemId"], options);
}
getKnowledgeItemById.commandId = 'getKnowledgeItemById';

export function importData(input: ImportDataInput, options?: InvokeOptions): Promise<ImportDataOutput> {
  return invokeGeneratedFields1<ImportDataOutput>(7, 'importData', input, input["dataJson"], options);
}
importData.commandId = 'importData';

export function initializeCore(input: InitializeCoreInput, options?: InvokeOptions): Promise<InitializeCoreOutput> {
  return invokeGeneratedFields1<InitializeCoreOutput>(33, 'initializeCore', input, input["dbPath"], options);
}
initializeCore.commandId = 'initializeCore';

export function initializeReviewSchedule(input: InitializeReviewScheduleInput, options?: InvokeOptions): Promise<InitializeReviewScheduleOutput> {
  return invokeGenerated<InitializeReviewScheduleOutput>(32, 'initializeReviewSchedule', input, options);
}
initializeReviewSchedule.commandId = 'initializeReviewSchedule';

export function listConversationMessages(input: ListConversationMessagesInput, options?: InvokeOptions): Promise<ListConversationMessagesOutput> {
  return invokeGeneratedFields1<ListConversationMessagesOutput>(23, 'listConversationMessages', input, input["conversationId"], options);
}
listConversationMessages.commandId = 'listConversationMessages';

export function listConversations(input: ListConversationsInput, options?: InvokeOptions): Promise<ListConversationsOutput> {
  return invokeGenerated<ListConversationsOutput>(2, 'listConversations', input, options);
}
listConversations.commandId = 'listConversations';

export function listKnowledgeItems(input: ListKnowledgeItemsInput, options?: InvokeOptions): Promise<ListKnowledgeItemsOutput> {
  return invokeGenerated<ListKnowledgeItemsOutput>(15, 'listKnowledgeItems', input, options);
}
listKnowledgeItems.commandId = 'listKnowledgeItems';

export function listKnowledgeItemsByIds(input: ListKnowledgeItemsByIdsInput, options?: InvokeOptions): Promise<ListKnowledgeItemsOutputByIds> {
  return invokeGenerated<ListKnowledgeItemsOutputByIds>(19, 'listKnowledgeItemsByIds', input, options);
}
listKnowledgeItemsByIds.commandId = 'listKnowledgeItemsByIds';

export function listPendingKnowledgeItemsForLabeling(input: ListPendingKnowledgeItemsForLabelingInput, options?: InvokeOptions): Promise<ListPendingKnowledgeItemsForLabelingOutput> {
  return invokeGeneratedFields1<ListPendingKnowledgeItemsForLabelingOutput>(21, 'listPendingKnowledgeItemsForLabeling', input, input["limit"], options);
}
listPendingKnowledgeItemsForLabeling.commandId = 'listPendingKnowledgeItemsForLabeling';

export function listPendingRecommendations(input: ListPendingRecommendationsInput, options?: InvokeOptions): Promise<ListPendingRecommendationsOutput> {
  return invokeGenerated<ListPendingRecommendationsOutput>(29, 'listPendingRecommendations', input, options);
}
listPendingRecommendations.commandId = 'listPendingRecommendations';

export function listRecentFeedbackEvents(input: ListRecentFeedbackEventsInput, options?: InvokeOptions): Promise<ListRecentFeedbackEventsOutput> {
  return invokeGeneratedFields1<ListRecentFeedbackEventsOutput>(12, 'listRecentFeedbackEvents', input, input["limit"], options);
}
listRecentFeedbackEvents.commandId = 'listRecentFeedbackEvents';

export function listRecommendations(input: ListRecommendationsInput, options?: InvokeOptions): Promise<ListRecommendationsOutput> {
  return invokeGenerated<ListRecommendationsOutput>(28, 'listRecommendations', input, options);
}
listRecommendations.commandId = 'listRecommendations';

export function listWeeklyKnowledgeItems(input: ListWeeklyKnowledgeItemsInput, options?: InvokeOptions): Promise<ListWeeklyKnowledgeItemsOutput> {
  return invokeGeneratedFields1<ListWeeklyKnowledgeItemsOutput>(20, 'listWeeklyKnowledgeItems', input, input["since"], options);
}
listWeeklyKnowledgeItems.commandId = 'listWeeklyKnowledgeItems';

export function logRecommendationFeedback(input: LogRecommendationFeedbackInput, options?: InvokeOptions): Promise<LogRecommendationFeedbackOutput> {
  return invokeGenerated<LogRecommendationFeedbackOutput>(13, 'logRecommendationFeedback', input, options);
}
logRecommendationFeedback.commandId = 'logRecommendationFeedback';

export function mergeData(input: MergeDataInput, options?: InvokeOptions): Promise<MergeDataOutput> {
  return invokeGeneratedFields1<MergeDataOutput>(8, 'mergeData', input, input["dataJson"], options);
}
mergeData.commandId = 'mergeData';

export function mergeDelta(input: MergeDeltaInput, options?: InvokeOptions): Promise<MergeDeltaOutput> {
  return invokeGeneratedFields1<MergeDeltaOutput>(9, 'mergeDelta', input, input["dataJson"], options);
}
mergeDelta.commandId = 'mergeDelta';

export function respondToRecommendation(input: RespondToRecommendationInput, options?: InvokeOptions): Promise<RespondToRecommendationOutput> {
  return invokeGenerated<RespondToRecommendationOutput>(30, 'respondToRecommendation', input, options);
}
respondToRecommendation.commandId = 'respondToRecommendation';

export function saveKnowledgeItem(input: SaveKnowledgeItemInput, options?: InvokeOptions): Promise<SaveKnowledgeItemOutput> {
  return invokeGenerated<SaveKnowledgeItemOutput>(14, 'saveKnowledgeItem', input, options);
}
saveKnowledgeItem.commandId = 'saveKnowledgeItem';

export function saveRecommendations(input: SaveRecommendationsInput, options?: InvokeOptions): Promise<SaveRecommendationsOutput> {
  return invokeGenerated<SaveRecommendationsOutput>(27, 'saveRecommendations', input, options);
}
saveRecommendations.commandId = 'saveRecommendations';

export function syncDataRevision(input: SyncDataRevisionInput, options?: InvokeOptions): Promise<SyncDataRevisionOutput> {
  return invokeGenerated<SyncDataRevisionOutput>(10, 'syncDataRevision', input, options);
}
syncDataRevision.commandId = 'syncDataRevision';

export function syncDiscover(input: SyncDiscoverInput, options?: InvokeOptions): Promise<SyncDiscoverOutput> {
  return invokeGeneratedFields1<SyncDiscoverOutput>(34, 'syncDiscover', input, input["timeoutMs"], options);
}
syncDiscover.commandId = 'syncDiscover';

export function updateConversation(input: UpdateConversationInput, options?: InvokeOptions): Promise<UpdateConversationOutput> {
  return invokeGenerated<UpdateConversationOutput>(3, 'updateConversation', input, options);
}
updateConversation.commandId = 'updateConversation';

export function updateKnowledgeItem(input: UpdateKnowledgeItemInput, options?: InvokeOptions): Promise<UpdateKnowledgeItemOutput> {
  return invokeGenerated<UpdateKnowledgeItemOutput>(17, 'updateKnowledgeItem', input, options);
}
updateKnowledgeItem.commandId = 'updateKnowledgeItem';

export function updateMessage(input: UpdateMessageInput, options?: InvokeOptions): Promise<UpdateMessageOutput> {
  return invokeGenerated<UpdateMessageOutput>(25, 'updateMessage', input, options);
}
updateMessage.commandId = 'updateMessage';

export { configure as configureRustraEngine } from '@rustra/types';
