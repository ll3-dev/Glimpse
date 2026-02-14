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
  updated_at REAL NOT NULL
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
] as const;
