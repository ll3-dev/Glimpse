/**
 * Web SQLite Adapter for Drizzle ORM
 *
 * Simple in-memory storage with localStorage persistence for web platform
 * This is a mock implementation for web development/testing
 */

interface StoredItem {
  id: string;
  type: 'note' | 'link';
  title: string | null;
  body: string | null;
  url: string | null;
  summary: string | null;
  tags: string[] | null;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'glimpse-knowledge-items';

function loadItems(): StoredItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveItems(items: StoredItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

let items: StoredItem[] = loadItems();

/**
 * Drizzle sqlite-proxy compatible callback for web (mock)
 */
export async function nitroSQLiteCallback(
  sql: string,
  params: (string | number | boolean | null | ArrayBuffer)[],
  method: 'run' | 'all' | 'get' | 'values'
): Promise<{ rows: unknown[]; changes?: number; lastInsertRowId?: number }> {
  // Parse SQL to determine operation
  const sqlLower = sql.toLowerCase().trim();

  // SELECT operations
  if (sqlLower.startsWith('select')) {
    if (sqlLower.includes('from "knowledge_items"')) {
      // Reload from localStorage
      items = loadItems();

      // Sort by createdAt DESC
      const sortedItems = [...items].sort((a, b) => b.createdAt - a.createdAt);

      if (method === 'all' || method === 'values') {
        return {
          rows: sortedItems.map((item) => [
            item.id,
            item.type,
            item.title,
            item.body,
            item.url,
            item.summary,
            JSON.stringify(item.tags),
            item.createdAt,
            item.updatedAt,
          ]),
        };
      }

      if (method === 'get') {
        const first = sortedItems[0];
        if (first) {
          return {
            rows: [
              first.id,
              first.type,
              first.title,
              first.body,
              first.url,
              first.summary,
              JSON.stringify(first.tags),
              first.createdAt,
              first.updatedAt,
            ],
          };
        }
        return { rows: [] };
      }
    }
    return { rows: [] };
  }

  // INSERT operations
  if (sqlLower.startsWith('insert')) {
    // Extract values from params
    const [
      id,
      type,
      title,
      body,
      url,
      summary,
      tagsJson,
      createdAt,
      updatedAt,
    ] = params as [string, string, string | null, string | null, string | null, string | null, string, number, number];

    const newItem: StoredItem = {
      id,
      type: type as 'note' | 'link',
      title,
      body,
      url,
      summary,
      tags: tagsJson ? JSON.parse(tagsJson) : null,
      createdAt,
      updatedAt,
    };

    items.push(newItem);
    saveItems(items);

    return {
      rows: [],
      changes: 1,
      lastInsertRowId: items.length,
    };
  }

  // Default: return empty
  return { rows: [] };
}

/**
 * Batch callback for Drizzle batch operations
 */
export async function nitroSQLiteBatchCallback(
  queries: { sql: string; params: unknown[] }[]
): Promise<{ rows: unknown[] }[]> {
  for (const { sql, params } of queries) {
    await nitroSQLiteCallback(
      sql,
      params as (string | number | boolean | null | ArrayBuffer)[],
      'run'
    );
  }
  return queries.map(() => ({ rows: [] }));
}
