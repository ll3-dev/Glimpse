import type {
  CalculateNextReviewInput,
  CalculateNextReviewOutput,
  CalculateTagOverlapInput,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
} from '@glimpse/shared';

const unavailable = () => {
  throw new Error('GlimpseCore Nitro bridge is not available on this platform');
};

export const nativeCoreClient = {
  isAvailable(): boolean {
    return false;
  },

  calculateTagOverlap(_input: CalculateTagOverlapInput): number {
    return unavailable();
  },

  calculateNextReview(_input: CalculateNextReviewInput): CalculateNextReviewOutput {
    return unavailable();
  },

  initializeReviewSchedule(
    _input: InitializeReviewScheduleInput
  ): InitializeReviewScheduleOutput {
    return unavailable();
  },

  saveKnowledgeItemJson(_payloadJson: string): string {
    return unavailable();
  },

  listKnowledgeItemsJson(): string {
    return unavailable();
  },

  listKnowledgeItemsByIdsJson(_itemIdsJson: string): string {
    return unavailable();
  },

  listWeeklyKnowledgeItemsJson(_since: number): string {
    return unavailable();
  },

  listPendingKnowledgeItemsForLabelingJson(_limit: number): string {
    return unavailable();
  },

  getKnowledgeItemByIdJson(_itemId: string): string {
    return unavailable();
  },

  getDueKnowledgeItemsJson(_now: number, _limit: number | null): string {
    return unavailable();
  },

  updateKnowledgeItemJson(_itemId: string, _patchJson: string): string {
    return unavailable();
  },

  createConversationJson(_payloadJson: string): string {
    return unavailable();
  },

  listConversationsJson(): string {
    return unavailable();
  },

  updateConversationJson(_conversationId: string, _patchJson: string): string {
    return unavailable();
  },

  deleteConversation(_conversationId: string, _deletedAt: number): void {
    return unavailable();
  },

  listConversationMessagesJson(_conversationId: string): string {
    return unavailable();
  },

  addMessageJson(_payloadJson: string): string {
    return unavailable();
  },

  updateMessageJson(_messageId: string, _patchJson: string): string {
    return unavailable();
  },

  deleteMessage(_messageId: string, _deletedAt: number): void {
    return unavailable();
  },

  saveRecommendationsJson(_payloadJson: string): void {
    return unavailable();
  },

  listRecommendationsJson(): string {
    return unavailable();
  },

  listPendingRecommendationsJson(): string {
    return unavailable();
  },

  listRecentFeedbackEventsJson(_limit: number): string {
    return unavailable();
  },

  logRecommendationFeedbackJson(_payloadJson: string): string {
    return unavailable();
  },

  respondToRecommendationJson(
    _recommendationId: string,
    _status: string,
    _eventJson: string
  ): void {
    return unavailable();
  },
};
