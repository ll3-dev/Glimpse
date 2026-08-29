import type {
  Conversation,
  CoreClient,
  FeedbackEvent,
  DataImportSummary,
  GetDueKnowledgeItemsInput,
  KnowledgeItem,
  Message,
  Recommendation,
} from '@glimpse/shared';
import { calculateNextReviewState } from '@glimpse/features';

import { InMemoryStorage } from './native-core-in-memory-storage';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATA_EXPORT_FORMAT_VERSION = 2;

type PortableData = {
  formatVersion: number;
  exportedAt: number;
  knowledgeItems: KnowledgeItem[];
  conversations: Conversation[];
  messages: Message[];
  recommendations: Recommendation[];
  feedbackEvents: FeedbackEvent[];
  tombstones?: unknown[];
};

/** Merge clock of a single exported row — mirrors the SQL expressions the
 * Rust `max_merge_clock`/`export_delta` use per table, so the fallback's
 * deltas can never omit a row that would win a full merge. */
function rowClock(row: PortableData['knowledgeItems'][number]): number;
function rowClock(row: PortableData['conversations'][number]): number;
function rowClock(row: PortableData['messages'][number]): number;
function rowClock(row: PortableData['recommendations'][number]): number;
function rowClock(row: PortableData['feedbackEvents'][number]): number;
function rowClock(
  row:
    | PortableData['knowledgeItems'][number]
    | PortableData['conversations'][number]
    | PortableData['messages'][number]
    | PortableData['recommendations'][number]
    | PortableData['feedbackEvents'][number],
): number {
  const record = row as unknown as Record<string, unknown>;
  const deletedAt = typeof record.deletedAt === 'number' ? record.deletedAt : null;
  const respondedAt = typeof record.respondedAt === 'number' ? record.respondedAt : null;
  const updatedAt = typeof record.updatedAt === 'number' ? record.updatedAt : null;
  const createdAt = record.createdAt as number;
  return (
    deletedAt ?? respondedAt ?? updatedAt ?? createdAt
  );
}

function parsePortableData(dataJson: string): PortableData {
  const parsed: unknown = JSON.parse(dataJson);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('가져오기 데이터는 JSON 객체여야 합니다.');
  }
  const data = parsed as Partial<PortableData>;
  if (
    typeof data.formatVersion !== 'number' ||
    data.formatVersion < 1 ||
    data.formatVersion > DATA_EXPORT_FORMAT_VERSION
  ) {
    throw new Error(`지원하지 않는 데이터 버전입니다: ${String(data.formatVersion)}`);
  }
  const collections = [
    data.knowledgeItems,
    data.conversations,
    data.messages,
    data.recommendations,
    data.feedbackEvents,
  ];
  if (collections.some((collection) => !Array.isArray(collection))) {
    throw new Error('가져오기 데이터의 컬렉션 형식이 올바르지 않습니다.');
  }
  return data as PortableData;
}

function createNotFoundError(entityName: string, id: string): Error {
  return new Error(`${entityName} not found: ${id}`);
}

function unwrapOrThrow<T>(entityName: string, id: string, value: T | undefined): T {
  if (value === undefined) {
    throw createNotFoundError(entityName, id);
  }
  return value;
}

function calculateTagOverlap(
  input: Parameters<CoreClient['calculateTagOverlap']>[0],
): Promise<number> {
  const leftTags = new Set(input.left.tags ?? []);
  const rightTags = new Set(input.right.tags ?? []);
  if (leftTags.size === 0 && rightTags.size === 0) {
    return Promise.resolve(0);
  }

  let intersection = 0;
  for (const tag of leftTags) {
    if (rightTags.has(tag)) {
      intersection += 1;
    }
  }

  const union = leftTags.size + rightTags.size - intersection;
  return Promise.resolve(union > 0 ? intersection / union : 0);
}

function calculateNextReview(
  input: Parameters<CoreClient['calculateNextReview']>[0],
): ReturnType<CoreClient['calculateNextReview']> {
  // Delegates to the shared @glimpse/features scheduler so the fallback path
  // (no native core available) schedules identically to mobile review actions
  // and the desktop review screen — one implementation, three entry points.
  const decision = calculateNextReviewState(
    input.lastReviewedAt,
    input.nextReviewAt,
    input.feedbackType,
    input.now,
    { stabilityDays: input.stability ?? 0.5, difficulty: input.difficulty ?? 5.0 },
  );
  return Promise.resolve(decision);
}

function initializeReviewSchedule(
  input: Parameters<CoreClient['initializeReviewSchedule']>[0],
): ReturnType<CoreClient['initializeReviewSchedule']> {
  return Promise.resolve({
    nextReviewAt: input.createdAt + (input.intervalMs ?? DAY_MS),
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
  });
}

export function createFallbackCoreClient(
  storage: InMemoryStorage = new InMemoryStorage(),
): CoreClient {
  return {
    async initialize(): Promise<void> {},

    calculateTagOverlap,
    calculateNextReview,
    initializeReviewSchedule,

    async saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem> {
      storage.addKnowledgeItem(item);
      return item;
    },

    async listKnowledgeItems(): Promise<KnowledgeItem[]> {
      return storage.getAllKnowledgeItems();
    },

    async listKnowledgeItemsByIds(itemIds: string[]): Promise<KnowledgeItem[]> {
      const idSet = new Set(itemIds);
      return (await this.listKnowledgeItems()).filter((item) => idSet.has(item.id));
    },

    async listWeeklyKnowledgeItems(since: number): Promise<KnowledgeItem[]> {
      return (await this.listKnowledgeItems()).filter((item) => item.createdAt >= since);
    },

    async listPendingKnowledgeItemsForLabeling(limit: number): Promise<KnowledgeItem[]> {
      return (await this.listKnowledgeItems())
        .filter((item) => item.labelStatus === 'pending')
        .slice(0, limit);
    },

    async getDueKnowledgeItems(input: GetDueKnowledgeItemsInput): Promise<KnowledgeItem[]> {
      const due = (await this.listKnowledgeItems()).filter((item) => {
        if (!item.nextReviewAt) {
          return true;
        }
        return item.nextReviewAt <= input.now;
      });
      return input.limit === undefined ? due : due.slice(0, input.limit);
    },

    async getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null> {
      return storage.getKnowledgeItem(itemId) ?? null;
    },

    async updateKnowledgeItem(
      itemId: string,
      patch: Partial<KnowledgeItem>,
    ): Promise<KnowledgeItem> {
      return unwrapOrThrow(
        'Knowledge item',
        itemId,
        storage.updateKnowledgeItem(itemId, patch),
      );
    },

    async deleteKnowledgeItem(itemId: string): Promise<void> {
      storage.deleteKnowledgeItem(itemId);
    },

    async createConversation(conversation: Conversation): Promise<Conversation> {
      storage.addConversation(conversation);
      return conversation;
    },

    async listConversations(): Promise<Conversation[]> {
      return storage.getAllConversations();
    },

    async updateConversation(
      conversationId: string,
      patch: Partial<Conversation>,
    ): Promise<Conversation> {
      return unwrapOrThrow(
        'Conversation',
        conversationId,
        storage.updateConversation(conversationId, patch),
      );
    },

    async deleteConversation(conversationId: string): Promise<void> {
      storage.deleteConversation(conversationId);
    },

    async listConversationMessages(conversationId: string): Promise<Message[]> {
      return storage.getMessages(conversationId);
    },

    async addMessage(message: Message): Promise<Message> {
      storage.addMessage(message.conversationId, message);
      return message;
    },

    async updateMessage(
      messageId: string,
      patch: Partial<Message>,
    ): Promise<Message> {
      return unwrapOrThrow('Message', messageId, storage.updateMessage(messageId, patch));
    },

    async deleteMessage(messageId: string): Promise<void> {
      storage.deleteMessage(messageId);
    },

    async saveRecommendations(recommendations: Recommendation[]): Promise<void> {
      for (const recommendation of recommendations) {
        storage.addRecommendation(recommendation);
      }
    },

    async listRecommendations(): Promise<Recommendation[]> {
      return storage.getAllRecommendations();
    },

    async listPendingRecommendations(): Promise<Recommendation[]> {
      return storage
        .getAllRecommendations()
        .filter((recommendation) => recommendation.status === 'pending');
    },

    async respondToRecommendation(
      recommendationId: string,
      status: 'accepted' | 'ignored' | 'dismissed',
    ): Promise<void> {
      storage.updateRecommendation(recommendationId, {
        status,
        respondedAt: Date.now(),
      });
    },

    async listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]> {
      return storage.getRecentFeedbackEvents(limit);
    },

    async logRecommendationFeedback(event: FeedbackEvent): Promise<FeedbackEvent> {
      storage.addFeedbackEvent(event);
      return event;
    },

    async exportData(): Promise<string> {
      const data: PortableData = {
        formatVersion: DATA_EXPORT_FORMAT_VERSION,
        exportedAt: Date.now(),
        knowledgeItems: storage.getAllKnowledgeItems(),
        conversations: storage.getAllConversations(),
        messages: storage.getAllMessages(),
        recommendations: storage.getAllRecommendations(),
        feedbackEvents: storage.getAllFeedbackEvents(),
      };
      return JSON.stringify(data, null, 2);
    },

    async exportDelta(sinceClockMs: number): Promise<string> {
      // Fallback twin of SqliteStorage::export_delta: strict-greater select
      // per table against the same row clocks the full merge compares. All
      // tombstones ride along (deletes must never be missed) — the fallback
      // store keeps none, so a full-merge pass elsewhere reconciles deletes.
      const newerThan = <T>(rows: T[]): T[] =>
        rows.filter((row) => rowClock(row as PortableData['knowledgeItems'][number]) > sinceClockMs);
      const data: PortableData = {
        formatVersion: DATA_EXPORT_FORMAT_VERSION,
        exportedAt: Date.now(),
        knowledgeItems: newerThan(storage.getAllKnowledgeItems()),
        conversations: newerThan(storage.getAllConversations()),
        messages: newerThan(storage.getAllMessages()),
        recommendations: newerThan(storage.getAllRecommendations()),
        feedbackEvents: newerThan(storage.getAllFeedbackEvents()),
        tombstones: [],
      };
      return JSON.stringify(data);
    },

    async syncDataRevision(): Promise<number> {
      return storage.dataRevision;
    },

    async importData(dataJson: string): Promise<DataImportSummary> {
      const data = parsePortableData(dataJson);
      storage.clear();
      data.knowledgeItems.forEach((item) => storage.addKnowledgeItem(item));
      data.conversations.forEach((conversation) => storage.addConversation(conversation));
      data.messages.forEach((message) => storage.addMessage(message.conversationId, message));
      data.recommendations.forEach((recommendation) =>
        storage.addRecommendation(recommendation),
      );
      data.feedbackEvents.forEach((event) => storage.addFeedbackEvent(event));
      return {
        knowledgeItems: data.knowledgeItems.length,
        conversations: data.conversations.length,
        messages: data.messages.length,
        recommendations: data.recommendations.length,
        feedbackEvents: data.feedbackEvents.length,
      };
    },

    async mergeData(dataJson: string): Promise<DataImportSummary> {
      // The fallback only runs in tests/web preview. Native builds use the
      // Rust merge implementation with tombstones and deterministic clocks.
      return this.importData(dataJson);
    },

    async mergeDelta(dataJson: string): Promise<DataImportSummary> {
      // Row-wise LWW merge — the fallback twin of SqliteStorage::apply_delta.
      // Without this, sync-client degrades the incremental path to mergeData
      // (a full-store replace), which would wipe rows the delta did not carry.
      const delta = parsePortableData(dataJson);
      let written = 0;
      const existing = new Map(
        (await this.listKnowledgeItems()).map((item) => [item.id, item]),
      );
      for (const candidate of delta.knowledgeItems) {
        const current = existing.get(candidate.id);
        if (!current || current.updatedAt <= candidate.updatedAt) {
          existing.set(candidate.id, candidate);
          storage.updateKnowledgeItem(candidate.id, candidate) ??
            storage.addKnowledgeItem(candidate);
          written += 1;
        }
      }
      return {
        knowledgeItems: written,
        conversations: 0,
        messages: 0,
        recommendations: 0,
        feedbackEvents: 0,
      };
    },

    async deleteAllData(): Promise<void> {
      storage.clear();
    },
  };
}
