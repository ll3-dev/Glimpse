import type {
  KnowledgeItem,
  Conversation,
  Message,
  Recommendation,
  FeedbackEvent,
  GraphAnalysisCommitInput,
  GraphAnalysisCommitResult,
  GraphAnalysisRecord,
} from '@glimpse/shared';

/**
 * In-memory stub storage for development when the rustra JSI bridge is
 * not available (Expo Go, unbundled JS).
 */
export class InMemoryStorage {
  private knowledgeItems = new Map<string, KnowledgeItem>();
  private conversations = new Map<string, Conversation>();
  private messages = new Map<string, Message[]>();
  private recommendations = new Map<string, Recommendation>();
  private feedbackEvents: FeedbackEvent[] = [];
  private graphAnalysis = new Map<string, GraphAnalysisRecord>();

  /** Monotonic write counter — the in-memory twin of the Rust
   * `sync_data_revision` sync-table trigger counter, consumed by
   * useAutoSync's local-change detection. */
  dataRevision = 0;

  private touch(): void {
    this.dataRevision += 1;
  }

  addKnowledgeItem(item: KnowledgeItem): void {
    this.knowledgeItems.set(item.id, item);
    this.touch();
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
    this.touch();
    return updated;
  }

  deleteKnowledgeItem(id: string): boolean {
    const touchingRecommendationIds = new Set<string>();
    const affectedItemIds = new Set([id]);
    for (const recommendation of this.recommendations.values()) {
      if (recommendation.itemA_id === id || recommendation.itemB_id === id) {
        touchingRecommendationIds.add(recommendation.id);
        affectedItemIds.add(recommendation.itemA_id);
        affectedItemIds.add(recommendation.itemB_id);
      }
    }
    for (const recommendationId of touchingRecommendationIds) {
      this.recommendations.delete(recommendationId);
    }
    this.feedbackEvents = this.feedbackEvents.filter(
      (event) => !touchingRecommendationIds.has(event.recommendationId),
    );
    for (const itemId of affectedItemIds) {
      this.graphAnalysis.delete(itemId);
    }
    const removed = this.knowledgeItems.delete(id);
    if (removed) this.touch();
    return removed;
  }

  addConversation(conversation: Conversation): void {
    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
    this.touch();
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
    this.touch();
    return updated;
  }

  deleteConversation(id: string): void {
    const removed = this.conversations.delete(id);
    this.messages.delete(id);
    if (removed) this.touch();
  }

  addMessage(conversationId: string, message: Message): void {
    const messages = this.messages.get(conversationId);
    if (messages) {
      messages.push(message);
      this.touch();
    }
  }

  getMessages(conversationId: string): Message[] {
    return this.messages.get(conversationId) ?? [];
  }

  getAllMessages(): Message[] {
    return Array.from(this.messages.values()).flat();
  }

  getAllMessagesForConversation(): Message[][] {
    return Array.from(this.messages.values());
  }

  updateMessage(messageId: string, patch: Partial<Message>): Message | undefined {
    for (const messages of this.messages.values()) {
      const index = messages.findIndex((message) => message.id === messageId);
      if (index !== -1) {
        const updated = { ...messages[index], ...patch };
        messages[index] = updated;
        this.touch();
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
        this.touch();
        return;
      }
    }
  }

  addRecommendation(recommendation: Recommendation): void {
    this.recommendations.set(recommendation.id, recommendation);
    this.touch();
  }

  getAllGraphAnalysisRecords(): GraphAnalysisRecord[] {
    return Array.from(this.graphAnalysis.values()).sort((left, right) =>
      left.itemId.localeCompare(right.itemId),
    );
  }

  commitGraphAnalysis(input: GraphAnalysisCommitInput): GraphAnalysisCommitResult {
    for (const record of input.records) {
      if (!this.knowledgeItems.has(record.itemId)) {
        throw new Error(`Graph analysis item not found: ${record.itemId}`);
      }
    }
    for (const recommendation of input.recommendations) {
      if (
        recommendation.itemA_id === recommendation.itemB_id ||
        !this.knowledgeItems.has(recommendation.itemA_id) ||
        !this.knowledgeItems.has(recommendation.itemB_id)
      ) {
        throw new Error(`Graph recommendation has an invalid endpoint: ${recommendation.id}`);
      }
    }

    const pairKey = (left: string, right: string) =>
      left < right ? `${left}\u0000${right}` : `${right}\u0000${left}`;
    const existingPairs = new Set(
      this.recommendations.values().map((recommendation) =>
        pairKey(recommendation.itemA_id, recommendation.itemB_id),
      ),
    );
    let savedRecommendations = 0;
    for (const recommendation of input.recommendations) {
      const key = pairKey(recommendation.itemA_id, recommendation.itemB_id);
      if (existingPairs.has(key)) continue;
      existingPairs.add(key);
      const [itemA_id, itemB_id] = [recommendation.itemA_id, recommendation.itemB_id].sort();
      this.recommendations.set(recommendation.id, {
        ...recommendation,
        itemA_id,
        itemB_id,
      });
      savedRecommendations += 1;
    }
    for (const record of input.records) {
      this.graphAnalysis.set(record.itemId, record);
    }
    if (savedRecommendations > 0 || input.records.length > 0) this.touch();
    return {
      savedRecommendations,
      savedAnalysisRecords: input.records.length,
    };
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
    this.touch();
    return updated;
  }

  addFeedbackEvent(event: FeedbackEvent): void {
    this.feedbackEvents.push(event);
    this.touch();
  }

  getRecentFeedbackEvents(limit: number): FeedbackEvent[] {
    return this.feedbackEvents.slice(-limit);
  }

  getAllFeedbackEvents(): FeedbackEvent[] {
    return [...this.feedbackEvents];
  }

  clear(): void {
    this.knowledgeItems.clear();
    this.conversations.clear();
    this.messages.clear();
    this.recommendations.clear();
    this.feedbackEvents = [];
    this.graphAnalysis.clear();
    this.touch();
  }
}
