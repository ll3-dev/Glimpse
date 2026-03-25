// apps/mobile/generate/CoreClient.nitro.ts
import type { HybridObject } from 'react-native-nitro-modules';

/**
 * CoreClient Nitro Spec - Canonical API contract
 * This is the single source of truth for the mobile bridge API.
 *
 * Note: Using primitive types for Nitro compatibility.
 * Complex types are handled at the adapter layer.
 * feedbackType: 0 = remembered, 1 = postponed
 */
export interface CoreClient extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  // Lifecycle
  initialize(dbPath: string): Promise<void>;

  // Synchronous calculations (pure functions, no SQLite)
  calculateTagOverlap(leftTags: string, rightTags: string): number;
  calculateNextReview(
    lastReviewedAt: number | null,
    nextReviewAt: number | null,
    feedbackType: number,
    now: number
  ): string;
  initializeReviewSchedule(createdAt: number, intervalMs: number | null): string;

  // Knowledge Items - JSON string in/out for complex types
  saveKnowledgeItem(itemJson: string): Promise<string>;
  listKnowledgeItems(): Promise<string>;
  getKnowledgeItemById(itemId: string): Promise<string | null>;
  updateKnowledgeItem(itemId: string, patchJson: string): Promise<string>;

  // Conversations
  createConversation(conversationJson: string): Promise<string>;
  listConversations(): Promise<string>;
  updateConversation(conversationId: string, patchJson: string): Promise<string>;
  deleteConversation(conversationId: string, deletedAt: number): Promise<void>;

  // Messages
  listConversationMessages(conversationId: string): Promise<string>;
  addMessage(messageJson: string): Promise<string>;
  updateMessage(messageId: string, patchJson: string): Promise<string>;
  deleteMessage(messageId: string, deletedAt: number): Promise<void>;

  // Recommendations
  saveRecommendations(recommendationsJson: string): Promise<void>;
  listRecommendations(): Promise<string>;
  listPendingRecommendations(): Promise<string>;
  respondToRecommendation(recommendationId: string, status: string, feedbackEventJson: string): Promise<void>;

  // Feedback Events
  listRecentFeedbackEvents(limit: number): Promise<string>;
  logRecommendationFeedback(eventJson: string): Promise<string>;
}
