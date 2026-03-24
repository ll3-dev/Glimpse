import { Platform, TurboModuleRegistry } from 'react-native';
import type { HybridObject } from 'react-native-nitro-modules';
import { NitroModules } from 'react-native-nitro-modules';

export interface GlimpseCalculateNextReviewOutput {
  intervalMs: number;
  nextReviewAt: number;
}

export interface GlimpseInitializeReviewScheduleOutput {
  nextReviewAt: number;
  stability: number | null;
  difficulty: number | null;
  lastReviewedAt: number | null;
}

const ANDROID_INIT_MODULE_NAME = '__glimpseCoreJNI_prepare__';

export interface GlimpseCoreSpec
  extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  calculateTagOverlap(leftTags: string[] | null, rightTags: string[] | null): number;
  calculateNextReview(
    lastReviewedAt: number | null,
    nextReviewAt: number | null,
    feedbackType: string,
    now: number
  ): GlimpseCalculateNextReviewOutput;
  initializeReviewSchedule(
    createdAt: number,
    intervalMs: number | null
  ): GlimpseInitializeReviewScheduleOutput;
  saveKnowledgeItemJson(payloadJson: string): string;
  listKnowledgeItemsJson(): string;
  listKnowledgeItemsByIdsJson(itemIdsJson: string): string;
  listWeeklyKnowledgeItemsJson(since: number): string;
  listPendingKnowledgeItemsForLabelingJson(limit: number): string;
  getKnowledgeItemByIdJson(itemId: string): string;
  getDueKnowledgeItemsJson(now: number, limit: number | null): string;
  updateKnowledgeItemJson(itemId: string, patchJson: string): string;
  createConversationJson(payloadJson: string): string;
  listConversationsJson(): string;
  updateConversationJson(conversationId: string, patchJson: string): string;
  deleteConversation(conversationId: string, deletedAt: number): void;
  listConversationMessagesJson(conversationId: string): string;
  addMessageJson(payloadJson: string): string;
  updateMessageJson(messageId: string, patchJson: string): string;
  deleteMessage(messageId: string, deletedAt: number): void;
  saveRecommendationsJson(payloadJson: string): void;
  listRecommendationsJson(): string;
  listPendingRecommendationsJson(): string;
  listRecentFeedbackEventsJson(limit: number): string;
  logRecommendationFeedbackJson(payloadJson: string): string;
  respondToRecommendationJson(
    recommendationId: string,
    status: string,
    eventJson: string
  ): void;
}

let didInitializeAndroid = false;
let cachedCore: GlimpseCoreSpec | null | undefined;

function ensureAndroidBridgeReady(): void {
  if (Platform.OS !== 'android' || didInitializeAndroid) {
    return;
  }

  TurboModuleRegistry.get(ANDROID_INIT_MODULE_NAME);
  didInitializeAndroid = true;
}

function createNativeCore(): GlimpseCoreSpec | null {
  ensureAndroidBridgeReady();

  if (!NitroModules.hasHybridObject('GlimpseCore')) {
    return null;
  }

  return NitroModules.createHybridObject<GlimpseCoreSpec>('GlimpseCore');
}

export function getGlimpseCore(): GlimpseCoreSpec | null {
  if (cachedCore === undefined) {
    cachedCore = createNativeCore();
  }

  return cachedCore;
}

export default getGlimpseCore();
