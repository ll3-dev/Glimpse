import { index, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Knowledge item type enum
 * - 'note': User-created text notes
 * - 'link': Saved URLs with optional notes
 * - 'highlight': Key passages excerpted from reading
 * - 'screenshot': Visual captures with optional OCR
 * - 'share': Content received via OS share sheet
 */
export const knowledgeItemType = ['note', 'link', 'highlight', 'screenshot', 'share'] as const;
export type KnowledgeItemType = (typeof knowledgeItemType)[number];

export const knowledgeItemLabelStatus = [
  'idle',
  'pending',
  'provisional',
  'final',
  'failed',
] as const;
export type KnowledgeItemLabelStatus = (typeof knowledgeItemLabelStatus)[number];

export const knowledgeItemLabelSource = [
  'none',
  'rules',
  'apple',
  'local_small',
  'local_full',
  'byok',
] as const;
export type KnowledgeItemLabelSource = (typeof knowledgeItemLabelSource)[number];

/**
 * Knowledge Items table schema
 * Central storage for all user-captured knowledge (notes and links)
 */
export const knowledgeItems = sqliteTable(
  'knowledge_items',
  {
    // Unique identifier (cuid or uuid generated at application layer)
    id: text('id').primaryKey(),

    // Item type: 'note' or 'link'
    type: text('type', { enum: knowledgeItemType }).notNull(),

    // Optional title for the item
    title: text('title'),

    // Main content - required for notes, optional annotation for links
    body: text('body'),

    // URL - required for links, null for notes
    url: text('url'),

    // AI-generated summary (to be filled later by AI processing)
    summary: text('summary'),

    // Tags stored as JSON array string - parsed at application layer
    tags: text('tags', { mode: 'json' }).$type<string[]>(),

    // Lightweight taxonomy labels for archive classification
    labels: text('labels', { mode: 'json' }).$type<string[]>(),
    provisionalLabels: text('provisional_labels', { mode: 'json' }).$type<string[]>(),
    labelStatus: text('label_status', { enum: knowledgeItemLabelStatus }).default('idle'),
    labelSource: text('label_source', { enum: knowledgeItemLabelSource }).default('none'),
    labelVersion: text('label_version'),
    labelScore: real('label_score'),
    labelRequestedAt: real('label_requested_at'),
    labelCompletedAt: real('label_completed_at'),
    labelError: text('label_error'),

    // Creation timestamp (Unix epoch in milliseconds)
    createdAt: real('created_at').notNull(),

    // Last update timestamp (Unix epoch in milliseconds)
    updatedAt: real('updated_at').notNull(),

    // --- Spaced Repetition Fields (MVP v2) ---

    // Memory stability for FSRS algorithm (null if never reviewed)
    stability: real('stability'),

    // Difficulty level for FSRS algorithm (null if never reviewed)
    difficulty: real('difficulty'),

    // Last review timestamp (null if never reviewed)
    lastReviewedAt: real('last_reviewed_at'),

    // Next scheduled review timestamp (null if no review scheduled)
    nextReviewAt: real('next_review_at'),
  },
  (table) => ({
    typeIdx: index('knowledge_items_type_idx').on(table.type),
    createdAtIdx: index('knowledge_items_created_at_idx').on(table.createdAt),
    nextReviewAtIdx: index('knowledge_items_next_review_at_idx').on(table.nextReviewAt),
    labelStatusIdx: index('knowledge_items_label_status_idx').on(table.labelStatus),
    labelRequestedAtIdx: index('knowledge_items_label_requested_at_idx').on(table.labelRequestedAt),
  })
);

type KnowledgeItemRow = typeof knowledgeItems.$inferSelect;
type NewKnowledgeItemRow = typeof knowledgeItems.$inferInsert;

type OptionalKnowledgeItemLabelFields =
  | 'labels'
  | 'provisionalLabels'
  | 'labelStatus'
  | 'labelSource'
  | 'labelVersion'
  | 'labelScore'
  | 'labelRequestedAt'
  | 'labelCompletedAt'
  | 'labelError';

// Keep new labeling fields optional at the type boundary while the feature rolls out.
export type KnowledgeItem = Omit<KnowledgeItemRow, OptionalKnowledgeItemLabelFields> &
  Partial<Pick<KnowledgeItemRow, OptionalKnowledgeItemLabelFields>>;
export type NewKnowledgeItem = Omit<NewKnowledgeItemRow, OptionalKnowledgeItemLabelFields> &
  Partial<Pick<NewKnowledgeItemRow, OptionalKnowledgeItemLabelFields>>;

/**
 * Recommendation status enum
 * - 'pending': Initial state, awaiting user action
 * - 'accepted': User explicitly accepted the connection
 * - 'ignored': User explicitly rejected
 * - 'dismissed': User temporarily hid (may resurface later)
 */
export const recommendationStatus = ['pending', 'accepted', 'ignored', 'dismissed'] as const;
export type RecommendationStatus = (typeof recommendationStatus)[number];

/**
 * Recommendations table schema
 * Stores AI-suggested connections between knowledge items
 */
export const recommendations = sqliteTable(
  'recommendations',
  {
    // Unique identifier
    id: text('id').primaryKey(),

    // First item in the connection
    itemA_id: text('item_a_id')
      .notNull()
      .references(() => knowledgeItems.id),

    // Second item in the connection
    itemB_id: text('item_b_id')
      .notNull()
      .references(() => knowledgeItems.id),

    // Reason for the recommendation
    reason: text('reason'),

    // Current status
    status: text('status', { enum: recommendationStatus }).notNull().default('pending'),

    // Creation timestamp
    createdAt: real('created_at').notNull(),

    // Response timestamp (when user accepted/ignored/dismissed)
    respondedAt: real('responded_at'),
  },
  (table) => ({
    statusIdx: index('recommendations_status_idx').on(table.status),
    itemAIdx: index('recommendations_item_a_idx').on(table.itemA_id),
    itemBIdx: index('recommendations_item_b_idx').on(table.itemB_id),
    pairUniqueIdx: uniqueIndex('recommendations_item_pair_unique_idx').on(
      table.itemA_id,
      table.itemB_id
    ),
  })
);

// Type exports for recommendations
export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;

/**
 * Feedback action type enum
 * - 'accept': User accepted the recommendation
 * - 'ignore': User explicitly rejected
 * - 'dismiss': User temporarily dismissed
 */
export const feedbackActionType = ['accept', 'ignore', 'dismiss'] as const;
export type FeedbackActionType = (typeof feedbackActionType)[number];

/**
 * Feedback Events table schema
 * Logs user reactions to recommendations for learning/analytics
 */
export const feedbackEvents = sqliteTable(
  'feedback_events',
  {
    // Unique identifier
    id: text('id').primaryKey(),

    // Reference to the recommendation
    recommendationId: text('recommendation_id')
      .notNull()
      .references(() => recommendations.id),

    // Action taken by user
    action: text('action', { enum: feedbackActionType }).notNull(),

    // Timestamp of the event
    createdAt: real('created_at').notNull(),
  },
  (table) => ({
    recommendationIdIdx: index('feedback_events_recommendation_id_idx').on(
      table.recommendationId
    ),
    createdAtIdx: index('feedback_events_created_at_idx').on(table.createdAt),
  })
);

// Type exports for feedback events
export type FeedbackEvent = typeof feedbackEvents.$inferSelect;
export type NewFeedbackEvent = typeof feedbackEvents.$inferInsert;

/**
 * Message role enum
 * - 'user': Message from the user
 * - 'assistant': Message from the AI
 */
export const messageRole = ['user', 'assistant'] as const;
export type MessageRole = (typeof messageRole)[number];

/**
 * Conversations table schema
 * Stores chat conversations with optional context item
 */
export const conversations = sqliteTable(
  'conversations',
  {
    // Unique identifier
    id: text('id').primaryKey(),

    // Conversation title (auto-generated or user-set)
    title: text('title'),

    // Optional icon selected by the user
    icon: text('icon'),

    // Optional context item ID (from library)
    contextItemId: text('context_item_id'),

    // Creation timestamp
    createdAt: real('created_at').notNull(),

    // Last update timestamp
    updatedAt: real('updated_at').notNull(),

    // Soft delete timestamp
    deletedAt: real('deleted_at'),
  },
  (table) => ({
    createdAtIdx: index('conversations_created_at_idx').on(table.createdAt),
    contextItemIdx: index('conversations_context_item_idx').on(table.contextItemId),
  })
);

// Type exports for conversations
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

/**
 * Messages table schema
 * Stores individual messages within conversations
 */
export const messages = sqliteTable(
  'messages',
  {
    // Unique identifier
    id: text('id').primaryKey(),

    // Reference to conversation
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id),

    // Message role (user or assistant)
    role: text('role', { enum: messageRole }).notNull(),

    // Message content
    content: text('content').notNull(),

    // Creation timestamp
    createdAt: real('created_at').notNull(),

    // Last update timestamp (null if never edited)
    updatedAt: real('updated_at'),

    // Soft delete timestamp (null if not deleted)
    deletedAt: real('deleted_at'),
  },
  (table) => ({
    conversationIdx: index('messages_conversation_idx').on(table.conversationId),
    createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
  })
);

// Type exports for messages
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

/**
 * Embedding source type enum
 * - 'message': Embedding of a chat message
 * - 'knowledge_item': Embedding of a library item
 */
export const embeddingSourceType = ['message', 'knowledge_item'] as const;
export type EmbeddingSourceType = (typeof embeddingSourceType)[number];

/**
 * Embeddings table schema
 * Stores vector embeddings for RAG (Retrieval Augmented Generation)
 */
export const embeddings = sqliteTable(
  'embeddings',
  {
    // Unique identifier
    id: text('id').primaryKey(),

    // Source type
    sourceType: text('source_type', { enum: embeddingSourceType }).notNull(),

    // Source ID (message or knowledge item)
    sourceId: text('source_id').notNull(),

    // Vector embedding stored as JSON array
    vector: text('vector', { mode: 'json' }).$type<number[]>().notNull(),

    // Creation timestamp
    createdAt: real('created_at').notNull(),
  },
  (table) => ({
    sourceTypeIdx: index('embeddings_source_type_idx').on(table.sourceType),
    sourceIdIdx: index('embeddings_source_id_idx').on(table.sourceId),
  })
);

// Type exports for embeddings
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
