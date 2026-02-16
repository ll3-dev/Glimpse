/**
 * Web SQLite Adapter for Drizzle ORM
 *
 * Simple in-memory storage with localStorage persistence for web platform.
 */

import { Effect } from 'effect';
import { appError, tryPromise } from '@/src/lib/effect-result';

interface StoredItem {
  id: string;
  type: 'note' | 'link' | 'highlight' | 'screenshot' | 'share';
  title: string | null;
  body: string | null;
  url: string | null;
  summary: string | null;
  tags: string[] | null;
  createdAt: number;
  updatedAt: number;
  stability: number | null;
  difficulty: number | null;
  lastReviewedAt: number | null;
  nextReviewAt: number | null;
}

const STORAGE_KEY = 'glimpse-knowledge-items';

function loadItems(): StoredItem[] {
  const effect = Effect.try({
    try: () => {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? (JSON.parse(data) as StoredItem[]) : [];
    },
    catch: () => [] as StoredItem[],
  });

  return Effect.runSync(effect);
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
  const program = Effect.gen(function* () {
    const sqlLower = sql.toLowerCase().trim();

    if (sqlLower.startsWith('select')) {
      if (sqlLower.includes('from "knowledge_items"')) {
        items = loadItems();

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
              item.stability,
              item.difficulty,
              item.lastReviewedAt,
              item.nextReviewAt,
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
                first.stability,
                first.difficulty,
                first.lastReviewedAt,
                first.nextReviewAt,
              ],
            };
          }
          return { rows: [] };
        }
      }
      return { rows: [] };
    }

    if (sqlLower.startsWith('insert')) {
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
        stability,
        difficulty,
        lastReviewedAt,
        nextReviewAt,
      ] = params as [
        string,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string,
        number,
        number,
        number | null,
        number | null,
        number | null,
        number | null,
      ];

      const parsedTags = yield* Effect.try({
        try: () => (tagsJson ? (JSON.parse(tagsJson) as string[]) : null),
        catch: () => null,
      });

      const newItem: StoredItem = {
        id,
        type: type as StoredItem['type'],
        title,
        body,
        url,
        summary,
        tags: parsedTags,
        createdAt,
        updatedAt,
        stability: stability ?? null,
        difficulty: difficulty ?? null,
        lastReviewedAt: lastReviewedAt ?? null,
        nextReviewAt: nextReviewAt ?? null,
      };

      items.push(newItem);
      saveItems(items);

      return {
        rows: [],
        changes: 1,
        lastInsertRowId: items.length,
      };
    }

    return { rows: [] };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(appError('DATABASE_ERROR', 'Web sqlite callback failed', error))
    )
  );

  return Effect.runPromise(program);
}

/**
 * Batch callback for Drizzle batch operations
 */
export async function nitroSQLiteBatchCallback(
  queries: { sql: string; params: unknown[] }[]
): Promise<{ rows: unknown[] }[]> {
  const program = Effect.forEach(queries, ({ sql, params }) =>
    tryPromise(
      () =>
        nitroSQLiteCallback(
          sql,
          params as (string | number | boolean | null | ArrayBuffer)[],
          'run'
        ),
      (error) => appError('DATABASE_ERROR', 'Web sqlite batch callback failed', error)
    )
  ).pipe(Effect.map(() => queries.map(() => ({ rows: [] }))));

  return Effect.runPromise(program);
}
