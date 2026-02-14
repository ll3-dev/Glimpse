import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

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

/**
 * Knowledge Items table schema
 * Central storage for all user-collected knowledge (notes and links)
 */
export const knowledgeItems = sqliteTable('knowledge_items', {
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

  // Creation timestamp (Unix epoch in milliseconds)
  createdAt: real('created_at').notNull(),

  // Last update timestamp (Unix epoch in milliseconds)
  updatedAt: real('updated_at').notNull(),
});

// Type exports for use in application code
export type KnowledgeItem = typeof knowledgeItems.$inferSelect;
export type NewKnowledgeItem = typeof knowledgeItems.$inferInsert;

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
export const recommendations = sqliteTable('recommendations', {
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
});

// Type exports for recommendations
export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;
