import type {
  CalculateNextReviewInput,
  CalculateNextReviewOutput,
  CalculateTagOverlapInput,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
} from '@glimpse/shared';
import { GlimpseCore } from '@glimpse/mobile-core-module';

function toNitroOptionalNumber(value: number | null | undefined): number | undefined {
  return value ?? undefined;
}

function toNitroOptionalStringArray(
  value: string[] | null | undefined
): string[] | undefined {
  return value ?? undefined;
}

function getNativeCore() {
  return GlimpseCore;
}

function getRequiredNativeCore() {
  const core = getNativeCore();
  if (core === null) {
    throw new Error('GlimpseCore Nitro bridge is not registered');
  }
  return core;
}

export const nativeCoreClient = {
  isAvailable(): boolean {
    return getNativeCore() !== null;
  },

  calculateTagOverlap(input: CalculateTagOverlapInput): number {
    return getRequiredNativeCore().calculateTagOverlap(
      toNitroOptionalStringArray(input.left.tags),
      toNitroOptionalStringArray(input.right.tags)
    );
  },

  calculateNextReview(input: CalculateNextReviewInput): CalculateNextReviewOutput {
    const result = getRequiredNativeCore().calculateNextReview(
      toNitroOptionalNumber(input.lastReviewedAt),
      toNitroOptionalNumber(input.nextReviewAt),
      input.feedbackType,
      input.now
    );

    return {
      intervalMs: result.intervalMs,
      nextReviewAt: result.nextReviewAt,
    };
  },

  initializeReviewSchedule(
    input: InitializeReviewScheduleInput
  ): InitializeReviewScheduleOutput {
    const result = getRequiredNativeCore().initializeReviewSchedule(
      input.createdAt,
      toNitroOptionalNumber(input.intervalMs)
    );

    return {
      nextReviewAt: result.nextReviewAt,
      stability: result.stability,
      difficulty: result.difficulty,
      lastReviewedAt: result.lastReviewedAt,
    };
  },

  saveKnowledgeItemJson(payloadJson: string): string {
    return getRequiredNativeCore().saveKnowledgeItemJson(payloadJson);
  },

  listKnowledgeItemsJson(): string {
    return getRequiredNativeCore().listKnowledgeItemsJson();
  },

  listKnowledgeItemsByIdsJson(itemIdsJson: string): string {
    return getRequiredNativeCore().listKnowledgeItemsByIdsJson(itemIdsJson);
  },

  listWeeklyKnowledgeItemsJson(since: number): string {
    return getRequiredNativeCore().listWeeklyKnowledgeItemsJson(since);
  },

  listPendingKnowledgeItemsForLabelingJson(limit: number): string {
    return getRequiredNativeCore().listPendingKnowledgeItemsForLabelingJson(limit);
  },

  getKnowledgeItemByIdJson(itemId: string): string {
    return getRequiredNativeCore().getKnowledgeItemByIdJson(itemId);
  },

  getDueKnowledgeItemsJson(now: number, limit: number | null): string {
    return getRequiredNativeCore().getDueKnowledgeItemsJson(
      now,
      toNitroOptionalNumber(limit)
    );
  },

  updateKnowledgeItemJson(itemId: string, patchJson: string): string {
    return getRequiredNativeCore().updateKnowledgeItemJson(itemId, patchJson);
  },

  createConversationJson(payloadJson: string): string {
    return getRequiredNativeCore().createConversationJson(payloadJson);
  },

  listConversationsJson(): string {
    return getRequiredNativeCore().listConversationsJson();
  },

  updateConversationJson(conversationId: string, patchJson: string): string {
    return getRequiredNativeCore().updateConversationJson(conversationId, patchJson);
  },

  deleteConversation(conversationId: string, deletedAt: number): void {
    getRequiredNativeCore().deleteConversation(conversationId, deletedAt);
  },

  listConversationMessagesJson(conversationId: string): string {
    return getRequiredNativeCore().listConversationMessagesJson(conversationId);
  },

  addMessageJson(payloadJson: string): string {
    return getRequiredNativeCore().addMessageJson(payloadJson);
  },

  updateMessageJson(messageId: string, patchJson: string): string {
    return getRequiredNativeCore().updateMessageJson(messageId, patchJson);
  },

  deleteMessage(messageId: string, deletedAt: number): void {
    getRequiredNativeCore().deleteMessage(messageId, deletedAt);
  },

  saveRecommendationsJson(payloadJson: string): void {
    getRequiredNativeCore().saveRecommendationsJson(payloadJson);
  },

  listRecommendationsJson(): string {
    return getRequiredNativeCore().listRecommendationsJson();
  },

  listPendingRecommendationsJson(): string {
    return getRequiredNativeCore().listPendingRecommendationsJson();
  },

  listRecentFeedbackEventsJson(limit: number): string {
    return getRequiredNativeCore().listRecentFeedbackEventsJson(limit);
  },

  logRecommendationFeedbackJson(payloadJson: string): string {
    return getRequiredNativeCore().logRecommendationFeedbackJson(payloadJson);
  },

  respondToRecommendationJson(
    recommendationId: string,
    status: string,
    eventJson: string
  ): void {
    getRequiredNativeCore().respondToRecommendationJson(
      recommendationId,
      status,
      eventJson
    );
  },
};
