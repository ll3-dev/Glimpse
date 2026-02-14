export const DB_NAME = "glimpse.db";
export const KNOWLEDGE_ITEMS_TABLE_NAME = "knowledge_items";

export const CREATE_KNOWLEDGE_ITEMS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS knowledge_items (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('note', 'link')),
  title TEXT,
  body TEXT,
  url TEXT,
  summary TEXT,
  tags TEXT,
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL
);
`;

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
