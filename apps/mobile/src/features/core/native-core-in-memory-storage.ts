import type {
  KnowledgeItem,
  Conversation,
  Message,
  Recommendation,
  FeedbackEvent,
} from '@glimpse/shared';

/**
 * In-memory stub storage for development when Nitro module is not available.
 */
export class InMemoryStorage {
  private knowledgeItems = new Map<string, KnowledgeItem>();
  private conversations = new Map<string, Conversation>();
  private messages = new Map<string, Message[]>();
  private recommendations = new Map<string, Recommendation>();
  private feedbackEvents: FeedbackEvent[] = [];

  addKnowledgeItem(item: KnowledgeItem): void {
    this.knowledgeItems.set(item.id, item);
  }

  getKnowledgeItem(id: string): KnowledgeItem | undefined {
    return this.knowledgeItems.get(id);
  }

  getAllKnowledgeItems(): KnowledgeItem[] {
    return Array.from(this.knowledgeItems.values());
  }

  updateKnowledgeItem(id: string, patch: Partial<KnowledgeItem>): KnowledgeItem | undefined {
    const item = this.knowledgeItems.get(id);
    if (!item) {
      return undefined;
    }
    const updated = { ...item, ...patch };
    this.knowledgeItems.set(id, updated);
    return updated;
  }

  addConversation(conversation: Conversation): void {
    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
  }

  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  updateConversation(id: string, patch: Partial<Conversation>): Conversation | undefined {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      return undefined;
    }
    const updated = { ...conversation, ...patch };
    this.conversations.set(id, updated);
    return updated;
  }

  deleteConversation(id: string): void {
    this.conversations.delete(id);
    this.messages.delete(id);
  }

  addMessage(conversationId: string, message: Message): void {
    const messages = this.messages.get(conversationId);
    if (messages) {
      messages.push(message);
    }
  }

  getMessages(conversationId: string): Message[] {
    return this.messages.get(conversationId) ?? [];
  }

  updateMessage(messageId: string, patch: Partial<Message>): Message | undefined {
    for (const messages of this.messages.values()) {
      const index = messages.findIndex((message) => message.id === messageId);
      if (index !== -1) {
        const updated = { ...messages[index], ...patch };
        messages[index] = updated;
        return updated;
      }
    }
    return undefined;
  }

  deleteMessage(messageId: string): void {
    for (const messages of this.messages.values()) {
      const index = messages.findIndex((message) => message.id === messageId);
      if (index !== -1) {
        messages.splice(index, 1);
        return;
      }
    }
  }

  addRecommendation(recommendation: Recommendation): void {
    this.recommendations.set(recommendation.id, recommendation);
  }

  getAllRecommendations(): Recommendation[] {
    return Array.from(this.recommendations.values());
  }

  updateRecommendation(id: string, patch: Partial<Recommendation>): Recommendation | undefined {
    const recommendation = this.recommendations.get(id);
    if (!recommendation) {
      return undefined;
    }
    const updated = { ...recommendation, ...patch };
    this.recommendations.set(id, updated);
    return updated;
  }

  addFeedbackEvent(event: FeedbackEvent): void {
    this.feedbackEvents.push(event);
  }

  getRecentFeedbackEvents(limit: number): FeedbackEvent[] {
    return this.feedbackEvents.slice(-limit);
  }
}
