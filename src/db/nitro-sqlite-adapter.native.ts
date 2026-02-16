/**
 * Nitro SQLite Adapter for Drizzle ORM (Native)
 *
 * This adapter bridges react-native-nitro-sqlite with drizzle-orm/sqlite-proxy
 */

import { NitroSQLite } from "react-native-nitro-sqlite";
import { Effect } from "effect";
import {
  CREATE_FEEDBACK_EVENTS_TABLE_SQL,
  CREATE_KNOWLEDGE_ITEMS_TABLE_SQL,
  CREATE_RECOMMENDATIONS_TABLE_SQL,
  DB_NAME,
  FEEDBACK_EVENTS_SELECT_COLUMNS,
  FEEDBACK_EVENTS_TABLE_NAME,
  KNOWLEDGE_ITEMS_SELECT_COLUMNS,
  KNOWLEDGE_ITEMS_TABLE_NAME,
  RECOMMENDATIONS_SELECT_COLUMNS,
  RECOMMENDATIONS_TABLE_NAME,
  REQUIRED_COLUMNS,
} from "./constants";

// Initialize database
let isInitialized = false;
let initPromise: Promise<void> | null = null;
type NativeQueryRow = Record<string, string | number | boolean | ArrayBuffer | null>;
type NativeQueryMetadata = Record<string, { name: string; index: number }>;

function ensureKnowledgeItemsSchema() {
  const program = Effect.gen(function* () {
    const pragmaResult = yield* Effect.promise(() =>
      NitroSQLite.executeAsync(
        DB_NAME,
        `PRAGMA table_info(${KNOWLEDGE_ITEMS_TABLE_NAME});`,
      ),
    );
    const existingColumns = new Set(
      (pragmaResult.results as NativeQueryRow[]).map((row) => String(row.name)),
    );

    if (!existingColumns.has("id")) {
      yield* Effect.fail(
        new Error("knowledge_items table exists without id column. Please reset local DB."),
      );
    }

    for (const column of REQUIRED_COLUMNS) {
      if (existingColumns.has(column.name) || column.name === "id") {
        continue;
      }

      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(
          DB_NAME,
          `ALTER TABLE ${KNOWLEDGE_ITEMS_TABLE_NAME} ADD COLUMN ${column.definition};`,
        ),
      );
    }
  });

  return Effect.runPromise(program);
}

function isValidTagsJson(rawValue: unknown): boolean {
  if (rawValue === null) {
    return true;
  }

  if (typeof rawValue !== "string") {
    return false;
  }

  const parsed = Effect.runSync(
    Effect.try({
      try: () => JSON.parse(rawValue),
      catch: () => null,
    }),
  );
  return Array.isArray(parsed);
}

function sanitizeKnowledgeItemsRows() {
  const program = Effect.gen(function* () {
    const selectResult = yield* Effect.promise(() =>
      NitroSQLite.executeAsync(
        DB_NAME,
        `SELECT id, tags FROM ${KNOWLEDGE_ITEMS_TABLE_NAME};`,
      ),
    );
    const rows = selectResult.results as NativeQueryRow[];

    for (const row of rows) {
      if (isValidTagsJson(row.tags)) {
        continue;
      }

      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(
          DB_NAME,
          `UPDATE ${KNOWLEDGE_ITEMS_TABLE_NAME} SET tags = NULL WHERE id = ?;`,
          [row.id ?? null],
        ),
      );
    }
  });

  return Effect.runPromise(program);
}

function initDatabase() {
  if (isInitialized) {
    return Promise.resolve();
  }

  if (!initPromise) {
    const initEffect = Effect.gen(function* () {
      NitroSQLite.open({ name: DB_NAME });
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_KNOWLEDGE_ITEMS_TABLE_SQL),
      );
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_RECOMMENDATIONS_TABLE_SQL),
      );
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_FEEDBACK_EVENTS_TABLE_SQL),
      );
      yield* Effect.promise(() => ensureKnowledgeItemsSchema());
      yield* Effect.promise(() => sanitizeKnowledgeItemsRows());
      yield* Effect.sync(() => {
        isInitialized = true;
      });
    }).pipe(
      Effect.tapError(() =>
        Effect.sync(() => {
          initPromise = null;
        }),
      ),
    );

    initPromise = Effect.runPromise(initEffect);
  }

  return initPromise;
}

function getOrderedColumnNames(
  sql: string,
  metadata: NativeQueryMetadata | undefined,
  results: NativeQueryRow[],
): string[] {
  const sqlLower = sql.toLowerCase();
  if (
    sqlLower.includes(`from "${KNOWLEDGE_ITEMS_TABLE_NAME}"`) ||
    sqlLower.includes(`from ${KNOWLEDGE_ITEMS_TABLE_NAME}`)
  ) {
    return [...KNOWLEDGE_ITEMS_SELECT_COLUMNS];
  }

  if (
    sqlLower.includes(`from "${RECOMMENDATIONS_TABLE_NAME}"`) ||
    sqlLower.includes(`from ${RECOMMENDATIONS_TABLE_NAME}`)
  ) {
    return [...RECOMMENDATIONS_SELECT_COLUMNS];
  }

  if (
    sqlLower.includes(`from "${FEEDBACK_EVENTS_TABLE_NAME}"`) ||
    sqlLower.includes(`from ${FEEDBACK_EVENTS_TABLE_NAME}`)
  ) {
    return [...FEEDBACK_EVENTS_SELECT_COLUMNS];
  }

  if (metadata && Object.keys(metadata).length > 0) {
    const orderedByMetadata = Object.values(metadata)
      .sort((a, b) => a.index - b.index)
      .map((column) => column.name);

    const firstRow = results[0];
    if (
      firstRow &&
      orderedByMetadata.length === Object.keys(firstRow).length &&
      orderedByMetadata.every((name) =>
        Object.prototype.hasOwnProperty.call(firstRow, name),
      )
    ) {
      return orderedByMetadata;
    }
  }

  const firstRow = results[0];
  return firstRow ? Object.keys(firstRow) : [];
}

function mapRowToColumnArray(
  row: NativeQueryRow,
  orderedColumnNames: string[],
): unknown[] {
  if (orderedColumnNames.length === 0) {
    return Object.values(row);
  }

  return orderedColumnNames.map((columnName) => {
    const rawValue = Object.prototype.hasOwnProperty.call(row, columnName)
      ? row[columnName]
      : null;

    if (columnName === "tags" && typeof rawValue === "string") {
      const parsedTags = Effect.runSync(
        Effect.try({
          try: () => JSON.parse(rawValue),
          catch: () => null,
        }),
      );
      if (parsedTags === null) {
        return null;
      }
    }

    return rawValue;
  });
}

/**
 * Drizzle sqlite-proxy compatible callback for nitro-sqlite
 */
export async function nitroSQLiteCallback(
  sql: string,
  params: (string | number | boolean | null | ArrayBuffer)[],
  method: "run" | "all" | "get" | "values",
): Promise<{ rows: unknown[]; changes?: number; lastInsertRowId?: number }> {
  const program = Effect.gen(function* () {
    yield* Effect.promise(() => initDatabase());

    const result = yield* Effect.promise(() =>
      NitroSQLite.executeAsync(DB_NAME, sql, params),
    );
    const typedResults = result.results as NativeQueryRow[];
    const orderedColumnNames = getOrderedColumnNames(
      sql,
      result.metadata as NativeQueryMetadata | undefined,
      typedResults,
    );

    switch (method) {
      case "run":
        return {
          rows: [],
          changes: result.rowsAffected,
          lastInsertRowId: result.insertId ?? undefined,
        };

      case "all":
      case "values":
        return {
          rows: typedResults.map((row) => mapRowToColumnArray(row, orderedColumnNames)),
        };

      case "get": {
        const firstRow = typedResults[0];
        return {
          rows: firstRow ? mapRowToColumnArray(firstRow, orderedColumnNames) : [],
        };
      }

      default:
        return { rows: result.results };
    }
  });

  return Effect.runPromise(program);
}

/**
 * Batch callback for Drizzle batch operations
 */
export async function nitroSQLiteBatchCallback(
  queries: { sql: string; params: unknown[] }[],
): Promise<{ rows: unknown[] }[]> {
  const program = Effect.gen(function* () {
    yield* Effect.promise(() => initDatabase());

    const commands = queries.map((q) => ({
      query: q.sql,
      params: q.params as (string | number | boolean | null | ArrayBuffer)[],
    }));

    yield* Effect.promise(() => NitroSQLite.executeBatchAsync(DB_NAME, commands));

    return queries.map(() => ({ rows: [] }));
  });

  return Effect.runPromise(program);
}
