import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

/**
 * Knowledge item type enum
 * - 'note': User-created text notes
 * - 'link': Saved URLs with optional notes
 */
export const knowledgeItemType = ['note', 'link'] as const;
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
