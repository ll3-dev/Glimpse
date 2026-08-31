import type { AddMessageInput, AddMessageOutput, CalculateTagOverlapInput, CalculateTagOverlapOutput, CommitGraphAnalysisInput, CommitGraphAnalysisOutput, CreateConversationInput, CreateConversationOutput, DeleteAllDataInput, DeleteAllDataOutput, DeleteConversationInput, DeleteConversationOutput, DeleteKnowledgeItemInput, DeleteKnowledgeItemOutput, DeleteMessageInput, DeleteMessageOutput, DiscoveryBaseUrlInput, DiscoveryBaseUrlOutput, EndpointCandidatesInput, EndpointCandidatesOutput, ExportDataInput, ExportDataOutput, ExportDeltaInput, ExportDeltaOutput, GetDueKnowledgeItemsInput, GetDueKnowledgeItemsOutput, GetKnowledgeItemByIdInput, GetKnowledgeItemByIdOutput, ImportDataInput, ImportDataOutput, InitializeCoreInput, InitializeCoreOutput, InitializeReviewScheduleInput, InitializeReviewScheduleOutput, IsHoldingOffInput, IsHoldingOffOutput, ListConversationMessagesInput, ListConversationMessagesOutput, ListConversationsInput, ListConversationsOutput, ListGraphAnalysisRecordsInput, ListGraphAnalysisRecordsOutput, ListKnowledgeItemsByIdsInput, ListKnowledgeItemsInput, ListKnowledgeItemsOutput, ListKnowledgeItemsOutputByIds, ListPendingKnowledgeItemsForLabelingInput, ListPendingKnowledgeItemsForLabelingOutput, ListPendingRecommendationsInput, ListPendingRecommendationsOutput, ListRecentFeedbackEventsInput, ListRecentFeedbackEventsOutput, ListRecommendationsInput, ListRecommendationsOutput, ListWeeklyKnowledgeItemsInput, ListWeeklyKnowledgeItemsOutput, LogRecommendationFeedbackInput, LogRecommendationFeedbackOutput, MergeDataInput, MergeDataOutput, MergeDeltaInput, MergeDeltaOutput, NormalizeBaseUrlInput, NormalizeBaseUrlOutput, RecordFailureInput, RecordFailureOutput, RecordSuccessInput, RecordSuccessOutput, RespondToRecommendationInput, RespondToRecommendationOutput, SaveKnowledgeItemInput, SaveKnowledgeItemOutput, SaveRecommendationsInput, SaveRecommendationsOutput, SyncDataRevisionInput, SyncDataRevisionOutput, SyncDiscoverInput, SyncDiscoverOutput, UpdateConversationInput, UpdateConversationOutput, UpdateKnowledgeItemInput, UpdateKnowledgeItemOutput, UpdateMessageInput, UpdateMessageOutput } from './types.js';
import { createGeneratedFields2, invokeGenerated, invokeGeneratedFields1 } from '@rustra/types';
import type { InvokeOptions } from '@rustra/types';

export function addMessage(input: AddMessageInput, options?: InvokeOptions): Promise<AddMessageOutput> {
  return invokeGenerated<AddMessageOutput>(24, 'addMessage', input, options);
}
addMessage.commandId = 'addMessage';

export function calculateTagOverlap(input: CalculateTagOverlapInput, options?: InvokeOptions): Promise<CalculateTagOverlapOutput> {
  return invokeGenerated<CalculateTagOverlapOutput>(33, 'calculateTagOverlap', input, options);
}
calculateTagOverlap.commandId = 'calculateTagOverlap';

export function commitGraphAnalysis(input: CommitGraphAnalysisInput, options?: InvokeOptions): Promise<CommitGraphAnalysisOutput> {
  return invokeGenerated<CommitGraphAnalysisOutput>(28, 'commitGraphAnalysis', input, options);
}
commitGraphAnalysis.commandId = 'commitGraphAnalysis';

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

/**
 * Discovery host + port → plain-http base URL, bracketing bare IPv6.
 */
export const discoveryBaseUrl = createGeneratedFields2<DiscoveryBaseUrlInput, DiscoveryBaseUrlOutput>(39, 'discoveryBaseUrl', "host", "port", 'discoveryBaseUrl');

/**
 * The tailnet endpoint remains valid across network changes, while a cached
 * LAN address commonly becomes stale as soon as the phone leaves Wi-Fi —
 * tailnet first, deduped, empties dropped.
 */
export function endpointCandidates(input: EndpointCandidatesInput, options?: InvokeOptions): Promise<EndpointCandidatesOutput> {
  return invokeGenerated<EndpointCandidatesOutput>(37, 'endpointCandidates', input, options);
}
endpointCandidates.commandId = 'endpointCandidates';

export function exportData(input: ExportDataInput, options?: InvokeOptions): Promise<ExportDataOutput> {
  return invokeGenerated<ExportDataOutput>(5, 'exportData', input, options);
}
exportData.commandId = 'exportData';

/**
 * Incremental export for the upstream (client→desktop) delta path: rows
 * whose merge clock is strictly newer than `since_clock_ms`, plus all
 * tombstones. Mirrors `export_data` but bounded by a clock cursor.
 */
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

/**
 * Opens the SQLite database at `dbPath` and installs it as the process-wide
 * [`SharedCore`].
 * 
 * Mobile hosts have no native setup hook before the JS runtime starts, so
 * this is the rustra-side entry point: the JS client calls it once at app
 * bootstrap with the same DB path the previous Nitro path used. Idempotent —
 * when the core is already installed (previous call, or the desktop Tauri
 * setup hook) it returns `initialized: false` without touching the disk,
 * preserving the "exactly one SQLite connection per process" invariant
 * across host styles. If two callers race past the fast path, the lock is
 * held across the swap: the last racer's connection survives and the
 * earlier one is closed on drop (last-wins under a true race; sequential
 * double-init is first-wins via the fast path above). The JS layer makes a
 * race impossible in practice — the bootstrap promise is memoized.
 */
export function initializeCore(input: InitializeCoreInput, options?: InvokeOptions): Promise<InitializeCoreOutput> {
  return invokeGeneratedFields1<InitializeCoreOutput>(35, 'initializeCore', input, input["dbPath"], options);
}
initializeCore.commandId = 'initializeCore';

export function initializeReviewSchedule(input: InitializeReviewScheduleInput, options?: InvokeOptions): Promise<InitializeReviewScheduleOutput> {
  return invokeGenerated<InitializeReviewScheduleOutput>(34, 'initializeReviewSchedule', input, options);
}
initializeReviewSchedule.commandId = 'initializeReviewSchedule';

/**
 * Manual (user-triggered) syncs ignore backoff; auto syncs respect it.
 */
export function isHoldingOff(input: IsHoldingOffInput, options?: InvokeOptions): Promise<IsHoldingOffOutput> {
  return invokeGenerated<IsHoldingOffOutput>(42, 'isHoldingOff', input, options);
}
isHoldingOff.commandId = 'isHoldingOff';

export function listConversationMessages(input: ListConversationMessagesInput, options?: InvokeOptions): Promise<ListConversationMessagesOutput> {
  return invokeGeneratedFields1<ListConversationMessagesOutput>(23, 'listConversationMessages', input, input["conversationId"], options);
}
listConversationMessages.commandId = 'listConversationMessages';

export function listConversations(input: ListConversationsInput, options?: InvokeOptions): Promise<ListConversationsOutput> {
  return invokeGenerated<ListConversationsOutput>(2, 'listConversations', input, options);
}
listConversations.commandId = 'listConversations';

export function listGraphAnalysisRecords(input: ListGraphAnalysisRecordsInput, options?: InvokeOptions): Promise<ListGraphAnalysisRecordsOutput> {
  return invokeGenerated<ListGraphAnalysisRecordsOutput>(27, 'listGraphAnalysisRecords', input, options);
}
listGraphAnalysisRecords.commandId = 'listGraphAnalysisRecords';

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
  return invokeGenerated<ListPendingRecommendationsOutput>(31, 'listPendingRecommendations', input, options);
}
listPendingRecommendations.commandId = 'listPendingRecommendations';

export function listRecentFeedbackEvents(input: ListRecentFeedbackEventsInput, options?: InvokeOptions): Promise<ListRecentFeedbackEventsOutput> {
  return invokeGeneratedFields1<ListRecentFeedbackEventsOutput>(12, 'listRecentFeedbackEvents', input, input["limit"], options);
}
listRecentFeedbackEvents.commandId = 'listRecentFeedbackEvents';

export function listRecommendations(input: ListRecommendationsInput, options?: InvokeOptions): Promise<ListRecommendationsOutput> {
  return invokeGenerated<ListRecommendationsOutput>(30, 'listRecommendations', input, options);
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

/**
 * Merge a remote snapshot without discarding newer local changes.
 */
export function mergeData(input: MergeDataInput, options?: InvokeOptions): Promise<MergeDataOutput> {
  return invokeGeneratedFields1<MergeDataOutput>(8, 'mergeData', input, input["dataJson"], options);
}
mergeData.commandId = 'mergeData';

/**
 * Merge an incremental sync delta row-by-row with LWW semantics instead of
 * rewriting the store — the watermark delta path's counterpart to
 * [`merge_data`]. The counts are rows this delta actually wrote (LWW
 * winners); an all-stale or empty delta reports all zeros, letting callers
 * skip post-sync refetches.
 */
export function mergeDelta(input: MergeDeltaInput, options?: InvokeOptions): Promise<MergeDeltaOutput> {
  return invokeGeneratedFields1<MergeDeltaOutput>(9, 'mergeDelta', input, input["dataJson"], options);
}
mergeDelta.commandId = 'mergeDelta';

/**
 * Trims, strips trailing slashes, and defaults schemeless hosts to https.
 */
export function normalizeBaseUrl(input: NormalizeBaseUrlInput, options?: InvokeOptions): Promise<NormalizeBaseUrlOutput> {
  return invokeGeneratedFields1<NormalizeBaseUrlOutput>(38, 'normalizeBaseUrl', input, input["value"], options);
}
normalizeBaseUrl.commandId = 'normalizeBaseUrl';

/**
 * `authRejected` freezes the controller until an explicit reset (re-pairing).
 */
export function recordSyncFailure(input: RecordFailureInput, options?: InvokeOptions): Promise<RecordFailureOutput> {
  return invokeGenerated<RecordFailureOutput>(40, 'recordSyncFailure', input, options);
}
recordSyncFailure.commandId = 'recordSyncFailure';

export function recordSyncSuccess(input: RecordSuccessInput, options?: InvokeOptions): Promise<RecordSuccessOutput> {
  return invokeGenerated<RecordSuccessOutput>(41, 'recordSyncSuccess', input, options);
}
recordSyncSuccess.commandId = 'recordSyncSuccess';

export function respondToRecommendation(input: RespondToRecommendationInput, options?: InvokeOptions): Promise<RespondToRecommendationOutput> {
  return invokeGenerated<RespondToRecommendationOutput>(32, 'respondToRecommendation', input, options);
}
respondToRecommendation.commandId = 'respondToRecommendation';

export function saveKnowledgeItem(input: SaveKnowledgeItemInput, options?: InvokeOptions): Promise<SaveKnowledgeItemOutput> {
  return invokeGenerated<SaveKnowledgeItemOutput>(14, 'saveKnowledgeItem', input, options);
}
saveKnowledgeItem.commandId = 'saveKnowledgeItem';

export function saveRecommendations(input: SaveRecommendationsInput, options?: InvokeOptions): Promise<SaveRecommendationsOutput> {
  return invokeGenerated<SaveRecommendationsOutput>(29, 'saveRecommendations', input, options);
}
saveRecommendations.commandId = 'saveRecommendations';

/**
 * Storage write counter maintained by sync-table triggers. Lets clients
 * detect local changes cheaply (revision moved) before paying for a delta
 * export.
 */
export function syncDataRevision(input: SyncDataRevisionInput, options?: InvokeOptions): Promise<SyncDataRevisionOutput> {
  return invokeGenerated<SyncDataRevisionOutput>(10, 'syncDataRevision', input, options);
}
syncDataRevision.commandId = 'syncDataRevision';

export function syncDiscover(input: SyncDiscoverInput, options?: InvokeOptions): Promise<SyncDiscoverOutput> {
  return invokeGeneratedFields1<SyncDiscoverOutput>(36, 'syncDiscover', input, input["timeoutMs"], options);
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
