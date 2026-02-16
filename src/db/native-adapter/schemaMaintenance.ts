import { Effect } from 'effect';
import { NitroSQLite } from 'react-native-nitro-sqlite';
import {
  DB_NAME,
  KNOWLEDGE_ITEMS_TABLE_NAME,
  REQUIRED_COLUMNS,
} from '../constants';
import type { NativeQueryRow } from './types';

export function ensureKnowledgeItemsSchema(): Promise<void> {
  const program = Effect.gen(function* () {
    const pragmaResult = yield* Effect.promise(() =>
      NitroSQLite.executeAsync(DB_NAME, `PRAGMA table_info(${KNOWLEDGE_ITEMS_TABLE_NAME});`)
    );

    const existingColumns = new Set(
      (pragmaResult.results as NativeQueryRow[]).map((row) => String(row.name))
    );

    if (!existingColumns.has('id')) {
      return yield* Effect.fail(
        new Error('knowledge_items table exists without id column. Please reset local DB.')
      );
    }

    for (const column of REQUIRED_COLUMNS) {
      if (existingColumns.has(column.name) || column.name === 'id') {
        continue;
      }

      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(
          DB_NAME,
          `ALTER TABLE ${KNOWLEDGE_ITEMS_TABLE_NAME} ADD COLUMN ${column.definition};`
        )
      );
    }
  });

  return Effect.runPromise(program);
}

function isValidTagsJson(rawValue: unknown): boolean {
  if (rawValue === null) {
    return true;
  }

  if (typeof rawValue !== 'string') {
    return false;
  }

  const parsed = Effect.runSync(
    Effect.try({
      try: () => JSON.parse(rawValue),
      catch: () => null,
    })
  );

  return Array.isArray(parsed);
}

export function sanitizeKnowledgeItemsRows(): Promise<void> {
  const program = Effect.gen(function* () {
    const selectResult = yield* Effect.promise(() =>
      NitroSQLite.executeAsync(
        DB_NAME,
        `SELECT id, tags FROM ${KNOWLEDGE_ITEMS_TABLE_NAME};`
      )
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
          [row.id ?? null]
        )
      );
    }
  });

  return Effect.runPromise(program);
}
