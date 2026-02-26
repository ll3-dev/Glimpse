/**
 * Database Constants
 *
 * IMPORTANT: These constants must stay in sync with schema.ts
 *
 * When adding columns to schema.ts, you MUST also update:
 * 1. CREATE_*_TABLE_SQL (for new installations)
 * 2. REQUIRED_COLUMNS (for migrations)
 * 3. *_SELECT_COLUMNS (for queries)
 *
 * Run `bun test src/db/schema-sync.test.ts` to verify synchronization.
 */

export const DB_NAME = "glimpse.db";
export const KNOWLEDGE_ITEMS_TABLE_NAME = "knowledge_items";
export const RECOMMENDATIONS_TABLE_NAME = "recommendations";

export const CREATE_KNOWLEDGE_ITEMS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS knowledge_items (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('note', 'link', 'highlight', 'screenshot', 'share')),
  title TEXT,
  body TEXT,
  url TEXT,
  summary TEXT,
  tags TEXT,
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL,
  stability REAL,
  difficulty REAL,
  last_reviewed_at REAL,
  next_review_at REAL
);
`;

export const CREATE_RECOMMENDATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY NOT NULL,
  item_a_id TEXT NOT NULL,
  item_b_id TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'ignored', 'dismissed')),
  created_at REAL NOT NULL,
  responded_at REAL,
  FOREIGN KEY (item_a_id) REFERENCES knowledge_items(id),
  FOREIGN KEY (item_b_id) REFERENCES knowledge_items(id)
);
`;

export const RECOMMENDATIONS_SELECT_COLUMNS = [
  "id",
  "item_a_id",
  "item_b_id",
  "reason",
  "status",
  "created_at",
  "responded_at",
] as const;

export const FEEDBACK_EVENTS_TABLE_NAME = "feedback_events";

export const CREATE_FEEDBACK_EVENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS feedback_events (
  id TEXT PRIMARY KEY NOT NULL,
  recommendation_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('accept', 'ignore', 'dismiss')),
  created_at REAL NOT NULL,
  FOREIGN KEY (recommendation_id) REFERENCES recommendations(id)
);
`;

export const CREATE_INDEXES_SQL = [
  "CREATE INDEX IF NOT EXISTS knowledge_items_type_idx ON knowledge_items(type);",
  "CREATE INDEX IF NOT EXISTS knowledge_items_created_at_idx ON knowledge_items(created_at);",
  "CREATE INDEX IF NOT EXISTS knowledge_items_next_review_at_idx ON knowledge_items(next_review_at);",
  "CREATE INDEX IF NOT EXISTS recommendations_status_idx ON recommendations(status);",
  "CREATE INDEX IF NOT EXISTS recommendations_item_a_idx ON recommendations(item_a_id);",
  "CREATE INDEX IF NOT EXISTS recommendations_item_b_idx ON recommendations(item_b_id);",
  "CREATE UNIQUE INDEX IF NOT EXISTS recommendations_item_pair_unique_idx ON recommendations(item_a_id, item_b_id);",
  "CREATE INDEX IF NOT EXISTS feedback_events_recommendation_id_idx ON feedback_events(recommendation_id);",
  "CREATE INDEX IF NOT EXISTS feedback_events_created_at_idx ON feedback_events(created_at);",
  // Chat tables indexes
  "CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations(created_at);",
  "CREATE INDEX IF NOT EXISTS conversations_context_item_idx ON conversations(context_item_id);",
  "CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id);",
  "CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);",
  "CREATE INDEX IF NOT EXISTS embeddings_source_type_idx ON embeddings(source_type);",
  "CREATE INDEX IF NOT EXISTS embeddings_source_id_idx ON embeddings(source_id);",
] as const;

export const FEEDBACK_EVENTS_SELECT_COLUMNS = [
  "id",
  "recommendation_id",
  "action",
  "created_at",
] as const;

export type RequiredColumn = {
  name: string;
  definition: string;
};

export const REQUIRED_COLUMNS: RequiredColumn[] = [
  { name: "id", definition: "id TEXT PRIMARY KEY NOT NULL" },
  { name: "type", definition: "type TEXT NOT NULL DEFAULT 'note'" },
  { name: "title", definition: "title TEXT" },
  { name: "body", definition: "body TEXT" },
  { name: "url", definition: "url TEXT" },
  { name: "summary", definition: "summary TEXT" },
  { name: "tags", definition: "tags TEXT" },
  { name: "created_at", definition: "created_at REAL NOT NULL DEFAULT 0" },
  { name: "updated_at", definition: "updated_at REAL NOT NULL DEFAULT 0" },
  { name: "stability", definition: "stability REAL" },
  { name: "difficulty", definition: "difficulty REAL" },
  { name: "last_reviewed_at", definition: "last_reviewed_at REAL" },
  { name: "next_review_at", definition: "next_review_at REAL" },
];

export const KNOWLEDGE_ITEMS_SELECT_COLUMNS = [
  "id",
  "type",
  "title",
  "body",
  "url",
  "summary",
  "tags",
  "created_at",
  "updated_at",
  "stability",
  "difficulty",
  "last_reviewed_at",
  "next_review_at",
] as const;

// Conversations table
export const CONVERSATIONS_TABLE_NAME = "conversations";

export const CREATE_CONVERSATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  context_item_id TEXT,
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL
);
`;

export const CONVERSATIONS_SELECT_COLUMNS = [
  "id",
  "title",
  "context_item_id",
  "created_at",
  "updated_at",
] as const;

// Messages table
export const MESSAGES_TABLE_NAME = "messages";

export const CREATE_MESSAGES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at REAL NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
`;

export const MESSAGES_SELECT_COLUMNS = [
  "id",
  "conversation_id",
  "role",
  "content",
  "created_at",
] as const;

// Embeddings table
export const EMBEDDINGS_TABLE_NAME = "embeddings";

export const CREATE_EMBEDDINGS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('message', 'knowledge_item')),
  source_id TEXT NOT NULL,
  vector TEXT NOT NULL,
  created_at REAL NOT NULL
);
`;

export const EMBEDDINGS_SELECT_COLUMNS = [
  "id",
  "source_type",
  "source_id",
  "vector",
  "created_at",
] as const;
