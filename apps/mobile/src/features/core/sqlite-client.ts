import type {
  CalculateNextReviewInput,
  CalculateNextReviewOutput,
  CalculateTagOverlapInput,
  Conversation,
  ConversationPatch,
  FeedbackActionType,
  FeedbackEvent,
  GetDueKnowledgeItemsInput,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
  KnowledgeItem,
  KnowledgeItemPatch,
  Message,
  MessagePatch,
  NewConversation,
  NewFeedbackEvent,
  NewKnowledgeItem,
  NewMessage,
  NewRecommendation,
  Recommendation,
  RecommendationStatus,
} from '@glimpse/shared';
import {
  CONVERSATIONS_SELECT_COLUMNS,
  FEEDBACK_EVENTS_SELECT_COLUMNS,
  KNOWLEDGE_ITEMS_SELECT_COLUMNS,
  MESSAGES_SELECT_COLUMNS,
  RECOMMENDATIONS_SELECT_COLUMNS,
} from '@/src/db/constants';
import {
  nitroSQLiteBatchCallback,
  nitroSQLiteCallback,
} from '@/src/db/nitro-sqlite-adapter';

const DEFAULT_INITIAL_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = DEFAULT_INITIAL_INTERVAL_MS;
const MAX_INTERVAL_MS = 30 * DEFAULT_INITIAL_INTERVAL_MS;

type SqlParam = string | number | boolean | null | ArrayBuffer;
type QueryRow = unknown[];

const KNOWLEDGE_ITEM_FIELDS = [
  'id',
  'type',
  'title',
  'body',
  'url',
  'summary',
  'tags',
  'labels',
  'provisional_labels',
  'label_status',
  'label_source',
  'label_version',
  'label_score',
  'label_requested_at',
  'label_completed_at',
  'label_error',
  'created_at',
  'updated_at',
  'stability',
  'difficulty',
  'last_reviewed_at',
  'next_review_at',
] as const;

const CONVERSATION_FIELDS = [
  'id',
  'title',
  'icon',
  'context_item_id',
  'created_at',
  'updated_at',
  'deleted_at',
] as const;

const MESSAGE_FIELDS = [
  'id',
  'conversation_id',
  'role',
  'content',
  'created_at',
  'updated_at',
  'deleted_at',
] as const;

const RECOMMENDATION_FIELDS = [
  'id',
  'item_a_id',
  'item_b_id',
  'reason',
  'status',
  'created_at',
  'responded_at',
] as const;

const FEEDBACK_EVENT_FIELDS = [
  'id',
  'recommendation_id',
  'action',
  'created_at',
] as const;

const KNOWLEDGE_ITEM_PATCH_COLUMNS: Record<keyof KnowledgeItemPatch, string> = {
  title: 'title',
  body: 'body',
  url: 'url',
  summary: 'summary',
  tags: 'tags',
  labels: 'labels',
  provisionalLabels: 'provisional_labels',
  labelStatus: 'label_status',
  labelSource: 'label_source',
  labelVersion: 'label_version',
  labelScore: 'label_score',
  labelRequestedAt: 'label_requested_at',
  labelCompletedAt: 'label_completed_at',
  labelError: 'label_error',
  updatedAt: 'updated_at',
  stability: 'stability',
  difficulty: 'difficulty',
  lastReviewedAt: 'last_reviewed_at',
  nextReviewAt: 'next_review_at',
  type: 'type',
};

const CONVERSATION_PATCH_COLUMNS: Record<keyof ConversationPatch, string> = {
  title: 'title',
  icon: 'icon',
  contextItemId: 'context_item_id',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
};

const MESSAGE_PATCH_COLUMNS: Record<keyof MessagePatch, string> = {
  role: 'role',
  content: 'content',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
};

export interface MobileCoreClient {
  calculateTagOverlap(input: CalculateTagOverlapInput): number;
  calculateNextReview(input: CalculateNextReviewInput): CalculateNextReviewOutput;
  initializeReviewSchedule(input: InitializeReviewScheduleInput): InitializeReviewScheduleOutput;
  saveKnowledgeItem(item: NewKnowledgeItem): Promise<KnowledgeItem>;
  listKnowledgeItems(): Promise<KnowledgeItem[]>;
  listKnowledgeItemsByIds(itemIds: string[]): Promise<KnowledgeItem[]>;
  listWeeklyKnowledgeItems(since: number): Promise<KnowledgeItem[]>;
  listPendingKnowledgeItemsForLabeling(limit: number): Promise<KnowledgeItem[]>;
  getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null>;
  getDueKnowledgeItems(input: GetDueKnowledgeItemsInput): Promise<KnowledgeItem[]>;
  updateKnowledgeItem(itemId: string, patch: KnowledgeItemPatch): Promise<KnowledgeItem>;
  createConversation(conversation: NewConversation): Promise<Conversation>;
  listConversations(): Promise<Conversation[]>;
  updateConversation(
    conversationId: string,
    patch: ConversationPatch
  ): Promise<Conversation>;
  deleteConversation(conversationId: string, deletedAt: number): Promise<void>;
  listConversationMessages(conversationId: string): Promise<Message[]>;
  addMessage(message: NewMessage): Promise<Message>;
  updateMessage(messageId: string, patch: MessagePatch): Promise<Message>;
  deleteMessage(messageId: string, deletedAt: number): Promise<void>;
  saveRecommendations(recommendations: NewRecommendation[]): Promise<void>;
  listRecommendations(): Promise<Recommendation[]>;
  listPendingRecommendations(): Promise<Recommendation[]>;
  listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]>;
  logRecommendationFeedback(event: NewFeedbackEvent): Promise<FeedbackEvent>;
  respondToRecommendation(
    recommendationId: string,
    status: RecommendationStatus,
    event: NewFeedbackEvent
  ): Promise<void>;
}

function toSqlJson(value: string[] | null | undefined): string | null {
  return value == null ? null : JSON.stringify(value);
}

function parseStringArray(value: unknown): string[] | null {
  if (value == null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return null;
  }
}

function toRecord(columns: readonly string[], row: QueryRow): Record<string, unknown> {
  return Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null]));
}

function mapKnowledgeItem(row: QueryRow): KnowledgeItem {
  const record = toRecord(KNOWLEDGE_ITEMS_SELECT_COLUMNS, row);
  return {
    id: String(record.id),
    type: record.type as KnowledgeItem['type'],
    title: asNullableString(record.title),
    body: asNullableString(record.body),
    url: asNullableString(record.url),
    summary: asNullableString(record.summary),
    tags: parseStringArray(record.tags),
    labels: parseStringArray(record.labels),
    provisionalLabels: parseStringArray(record.provisional_labels),
    labelStatus: (record.label_status as KnowledgeItem['labelStatus']) ?? null,
    labelSource: (record.label_source as KnowledgeItem['labelSource']) ?? null,
    labelVersion: asNullableString(record.label_version),
    labelScore: asNullableNumber(record.label_score),
    labelRequestedAt: asNullableNumber(record.label_requested_at),
    labelCompletedAt: asNullableNumber(record.label_completed_at),
    labelError: asNullableString(record.label_error),
    createdAt: Number(record.created_at ?? 0),
    updatedAt: Number(record.updated_at ?? 0),
    stability: asNullableNumber(record.stability),
    difficulty: asNullableNumber(record.difficulty),
    lastReviewedAt: asNullableNumber(record.last_reviewed_at),
    nextReviewAt: asNullableNumber(record.next_review_at),
  };
}

function mapConversation(row: QueryRow): Conversation {
  const record = toRecord(CONVERSATIONS_SELECT_COLUMNS, row);
  return {
    id: String(record.id),
    title: asNullableString(record.title),
    icon: asNullableString(record.icon),
    contextItemId: asNullableString(record.context_item_id),
    createdAt: Number(record.created_at ?? 0),
    updatedAt: Number(record.updated_at ?? 0),
    deletedAt: asNullableNumber(record.deleted_at),
  };
}

function mapMessage(row: QueryRow): Message {
  const record = toRecord(MESSAGES_SELECT_COLUMNS, row);
  return {
    id: String(record.id),
    conversationId: String(record.conversation_id),
    role: record.role as Message['role'],
    content: String(record.content ?? ''),
    createdAt: Number(record.created_at ?? 0),
    updatedAt: asNullableNumber(record.updated_at),
    deletedAt: asNullableNumber(record.deleted_at),
  };
}

function mapRecommendation(row: QueryRow): Recommendation {
  const record = toRecord(RECOMMENDATIONS_SELECT_COLUMNS, row);
  return {
    id: String(record.id),
    itemA_id: String(record.item_a_id),
    itemB_id: String(record.item_b_id),
    reason: asNullableString(record.reason),
    status: record.status as Recommendation['status'],
    createdAt: Number(record.created_at ?? 0),
    respondedAt: asNullableNumber(record.responded_at),
  };
}

function mapFeedbackEvent(row: QueryRow): FeedbackEvent {
  const record = toRecord(FEEDBACK_EVENTS_SELECT_COLUMNS, row);
  return {
    id: String(record.id),
    recommendationId: String(record.recommendation_id),
    action: record.action as FeedbackActionType,
    createdAt: Number(record.created_at ?? 0),
  };
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

async function run(sql: string, params: SqlParam[] = []): Promise<void> {
  await nitroSQLiteCallback(sql, params, 'run');
}

async function all(sql: string, params: SqlParam[] = []): Promise<QueryRow[]> {
  const result = await nitroSQLiteCallback(sql, params, 'all');
  return result.rows as QueryRow[];
}

async function batch(queries: { sql: string; params: SqlParam[] }[]): Promise<void> {
  await nitroSQLiteBatchCallback(queries);
}

function buildUpdateStatement<TPatch extends object>(
  tableName: string,
  idColumnName: string,
  idValue: string,
  patch: TPatch,
  columnMap: Record<string, string>
): { sql: string; params: SqlParam[] } | null {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return null;
  }

  const assignments = entries.map(
    ([key], index) => `${columnMap[key] ?? key} = ?${index + 1}`
  );
  const params = entries.map(([, value]) => normalizeSqlValue(value)).concat(idValue);

  return {
    sql: `UPDATE ${tableName} SET ${assignments.join(', ')} WHERE ${idColumnName} = ?${entries.length + 1};`,
    params,
  };
}

function normalizeSqlValue(value: unknown): SqlParam {
  if (value instanceof ArrayBuffer) {
    return value;
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value as SqlParam;
  }
  return JSON.stringify(value) as SqlParam;
}

function placeholders(count: number): string {
  return Array.from({ length: count }, (_, index) => `?${index + 1}`).join(', ');
}

// This client mirrors the future Craby bridge API so mobile orchestration can switch
// from JS fallback to Rust without changing feature call sites.
export const mobileCoreClient: MobileCoreClient = {
  calculateTagOverlap({ left, right }) {
    const leftTags = new Set(left.tags ?? []);
    return (right.tags ?? []).filter((tag) => leftTags.has(tag)).length;
  },

  calculateNextReview({ lastReviewedAt, nextReviewAt, feedbackType, now }) {
    const currentInterval =
      lastReviewedAt !== null && nextReviewAt !== null
        ? nextReviewAt - lastReviewedAt
        : DEFAULT_INITIAL_INTERVAL_MS;
    const nextInterval =
      feedbackType === 'remembered' ? currentInterval * 2 : currentInterval;
    const intervalMs = Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, nextInterval));

    return {
      intervalMs,
      nextReviewAt: now + intervalMs,
    };
  },

  initializeReviewSchedule({ createdAt, intervalMs }) {
    return {
      nextReviewAt: createdAt + (intervalMs ?? DEFAULT_INITIAL_INTERVAL_MS),
      stability: null,
      difficulty: null,
      lastReviewedAt: null,
    };
  },

  async saveKnowledgeItem(item) {
    await run(
      `INSERT INTO knowledge_items (${KNOWLEDGE_ITEM_FIELDS.join(', ')}) VALUES (${placeholders(KNOWLEDGE_ITEM_FIELDS.length)});`,
      [
        item.id,
        item.type,
        item.title,
        item.body,
        item.url,
        item.summary,
        toSqlJson(item.tags),
        toSqlJson(item.labels),
        toSqlJson(item.provisionalLabels),
        item.labelStatus ?? null,
        item.labelSource ?? null,
        item.labelVersion ?? null,
        item.labelScore ?? null,
        item.labelRequestedAt ?? null,
        item.labelCompletedAt ?? null,
        item.labelError ?? null,
        item.createdAt,
        item.updatedAt,
        item.stability,
        item.difficulty,
        item.lastReviewedAt,
        item.nextReviewAt,
      ]
    );

    return (await this.getKnowledgeItemById(item.id)) as KnowledgeItem;
  },

  async listKnowledgeItems() {
    const rows = await all(
      `SELECT ${KNOWLEDGE_ITEMS_SELECT_COLUMNS.join(', ')} FROM knowledge_items ORDER BY created_at DESC;`
    );
    return rows.map(mapKnowledgeItem);
  },

  async listKnowledgeItemsByIds(itemIds) {
    if (itemIds.length === 0) {
      return [];
    }
    const rows = await all(
      `SELECT ${KNOWLEDGE_ITEMS_SELECT_COLUMNS.join(', ')} FROM knowledge_items WHERE id IN (${placeholders(itemIds.length)});`,
      itemIds
    );
    return rows.map(mapKnowledgeItem);
  },

  async listWeeklyKnowledgeItems(since) {
    const rows = await all(
      `SELECT ${KNOWLEDGE_ITEMS_SELECT_COLUMNS.join(', ')} FROM knowledge_items WHERE created_at >= ?1 ORDER BY created_at DESC;`,
      [since]
    );
    return rows.map(mapKnowledgeItem);
  },

  async listPendingKnowledgeItemsForLabeling(limit) {
    const rows = await all(
      `SELECT ${KNOWLEDGE_ITEMS_SELECT_COLUMNS.join(', ')} FROM knowledge_items WHERE label_status = 'pending' ORDER BY label_requested_at ASC LIMIT ?1;`,
      [Math.max(0, limit)]
    );
    return rows.map(mapKnowledgeItem);
  },

  async getKnowledgeItemById(itemId) {
    const rows = await all(
      `SELECT ${KNOWLEDGE_ITEMS_SELECT_COLUMNS.join(', ')} FROM knowledge_items WHERE id = ?1 LIMIT 1;`,
      [itemId]
    );
    return rows[0] ? mapKnowledgeItem(rows[0]) : null;
  },

  async getDueKnowledgeItems({ now, limit }) {
    const sql = [
      `SELECT ${KNOWLEDGE_ITEMS_SELECT_COLUMNS.join(', ')}`,
      'FROM knowledge_items',
      'WHERE next_review_at IS NOT NULL AND next_review_at <= ?1',
      'ORDER BY next_review_at ASC',
      limit !== undefined && limit > 0 ? 'LIMIT ?2' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const rows = await all(sql, limit !== undefined && limit > 0 ? [now, limit] : [now]);
    return rows.map(mapKnowledgeItem);
  },

  async updateKnowledgeItem(itemId, patch) {
    const statement = buildUpdateStatement(
      'knowledge_items',
      'id',
      itemId,
      patch,
      KNOWLEDGE_ITEM_PATCH_COLUMNS
    );
    if (statement) {
      await run(statement.sql, statement.params);
    }

    const item = await this.getKnowledgeItemById(itemId);
    if (item === null) {
      throw new Error(`Knowledge item not found: ${itemId}`);
    }
    return item;
  },

  async createConversation(conversation) {
    await run(
      `INSERT INTO conversations (${CONVERSATION_FIELDS.join(', ')}) VALUES (${placeholders(CONVERSATION_FIELDS.length)});`,
      [
        conversation.id,
        conversation.title,
        conversation.icon,
        conversation.contextItemId,
        conversation.createdAt,
        conversation.updatedAt,
        conversation.deletedAt,
      ]
    );

    return this.updateConversation(conversation.id, {});
  },

  async listConversations() {
    const rows = await all(
      `SELECT ${CONVERSATIONS_SELECT_COLUMNS.join(', ')} FROM conversations WHERE deleted_at IS NULL ORDER BY updated_at DESC;`
    );
    return rows.map(mapConversation);
  },

  async updateConversation(conversationId, patch) {
    const statement = buildUpdateStatement(
      'conversations',
      'id',
      conversationId,
      patch,
      CONVERSATION_PATCH_COLUMNS
    );
    if (statement) {
      await run(statement.sql, statement.params);
    }

    const rows = await all(
      `SELECT ${CONVERSATIONS_SELECT_COLUMNS.join(', ')} FROM conversations WHERE id = ?1 LIMIT 1;`,
      [conversationId]
    );
    if (!rows[0]) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    return mapConversation(rows[0]);
  },

  async deleteConversation(conversationId, deletedAt) {
    await batch([
      {
        sql: 'UPDATE messages SET deleted_at = ?1 WHERE conversation_id = ?2;',
        params: [deletedAt, conversationId],
      },
      {
        sql: 'UPDATE conversations SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2;',
        params: [deletedAt, conversationId],
      },
    ]);
  },

  async listConversationMessages(conversationId) {
    const rows = await all(
      `SELECT ${MESSAGES_SELECT_COLUMNS.join(', ')} FROM messages WHERE conversation_id = ?1 AND deleted_at IS NULL ORDER BY created_at ASC;`,
      [conversationId]
    );
    return rows.map(mapMessage);
  },

  async addMessage(message) {
    await batch([
      {
        sql: `INSERT INTO messages (${MESSAGE_FIELDS.join(', ')}) VALUES (${placeholders(MESSAGE_FIELDS.length)});`,
        params: [
          message.id,
          message.conversationId,
          message.role,
          message.content,
          message.createdAt,
          message.updatedAt,
          message.deletedAt,
        ],
      },
      {
        sql: 'UPDATE conversations SET updated_at = ?1 WHERE id = ?2;',
        params: [message.createdAt, message.conversationId],
      },
    ]);

    return this.updateMessage(message.id, {});
  },

  async updateMessage(messageId, patch) {
    const statement = buildUpdateStatement(
      'messages',
      'id',
      messageId,
      patch,
      MESSAGE_PATCH_COLUMNS
    );
    if (statement) {
      await run(statement.sql, statement.params);
    }

    const rows = await all(
      `SELECT ${MESSAGES_SELECT_COLUMNS.join(', ')} FROM messages WHERE id = ?1 LIMIT 1;`,
      [messageId]
    );
    if (!rows[0]) {
      throw new Error(`Message not found: ${messageId}`);
    }
    return mapMessage(rows[0]);
  },

  async deleteMessage(messageId, deletedAt) {
    await run('UPDATE messages SET deleted_at = ?1 WHERE id = ?2;', [deletedAt, messageId]);
  },

  async saveRecommendations(recommendations) {
    if (recommendations.length === 0) {
      return;
    }

    await batch(
      recommendations.map((recommendation) => ({
        sql: `INSERT INTO recommendations (${RECOMMENDATION_FIELDS.join(', ')}) VALUES (${placeholders(RECOMMENDATION_FIELDS.length)});`,
        params: [
          recommendation.id,
          recommendation.itemA_id,
          recommendation.itemB_id,
          recommendation.reason,
          recommendation.status,
          recommendation.createdAt,
          recommendation.respondedAt,
        ],
      }))
    );
  },

  async listRecommendations() {
    const rows = await all(
      `SELECT ${RECOMMENDATIONS_SELECT_COLUMNS.join(', ')} FROM recommendations;`
    );
    return rows.map(mapRecommendation);
  },

  async listPendingRecommendations() {
    const rows = await all(
      `SELECT ${RECOMMENDATIONS_SELECT_COLUMNS.join(', ')} FROM recommendations WHERE status = 'pending';`
    );
    return rows.map(mapRecommendation);
  },

  async listRecentFeedbackEvents(limit) {
    const rows = await all(
      `SELECT ${FEEDBACK_EVENTS_SELECT_COLUMNS.join(', ')} FROM feedback_events ORDER BY created_at DESC LIMIT ?1;`,
      [limit]
    );
    return rows.map(mapFeedbackEvent);
  },

  async logRecommendationFeedback(event) {
    await run(
      `INSERT INTO feedback_events (${FEEDBACK_EVENT_FIELDS.join(', ')}) VALUES (${placeholders(FEEDBACK_EVENT_FIELDS.length)});`,
      [event.id, event.recommendationId, event.action, event.createdAt]
    );
    return event;
  },

  async respondToRecommendation(recommendationId, status, event) {
    await batch([
      {
        sql: 'UPDATE recommendations SET status = ?1, responded_at = ?2 WHERE id = ?3;',
        params: [status, event.createdAt, recommendationId],
      },
      {
        sql: `INSERT INTO feedback_events (${FEEDBACK_EVENT_FIELDS.join(', ')}) VALUES (${placeholders(FEEDBACK_EVENT_FIELDS.length)});`,
        params: [event.id, event.recommendationId, event.action, event.createdAt],
      },
    ]);
  },
};
