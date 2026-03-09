import { Effect } from 'effect';
import { NitroSQLite } from 'react-native-nitro-sqlite';
import {
  DB_NAME,
  KNOWLEDGE_ITEMS_TABLE_NAME,
  REQUIRED_COLUMNS,
} from '../constants';
import type { NativeQueryRow } from './types';

export async function ensureKnowledgeItemsSchema(): Promise<void> {
  console.log('[SchemaMigration] Function called');

  try {
    // Get existing columns
    const pragmaResult = await NitroSQLite.executeAsync(
      DB_NAME,
      `PRAGMA table_info(${KNOWLEDGE_ITEMS_TABLE_NAME});`
    );

    const existingColumns = new Set(
      (pragmaResult.results as NativeQueryRow[]).map((row) => String(row.name))
    );

    console.log('[SchemaMigration] Existing columns:', [...existingColumns]);

    if (!existingColumns.has('id')) {
      throw new Error('knowledge_items table exists without id column. Please reset local DB.');
    }

    // Find and add missing columns
    const missingColumns = REQUIRED_COLUMNS.filter(
      (col) => !existingColumns.has(col.name) && col.name !== 'id'
    );

    console.log('[SchemaMigration] Missing columns:', missingColumns.map((c) => c.name));

    for (const col of missingColumns) {
      console.log(`[SchemaMigration] Adding column: ${col.definition}`);
      await NitroSQLite.executeAsync(
        DB_NAME,
        `ALTER TABLE ${KNOWLEDGE_ITEMS_TABLE_NAME} ADD COLUMN ${col.definition};`
      );
      console.log(`[SchemaMigration] Added column: ${col.name}`);
    }

    // Recreate indexes for newly added columns
    const newIndexColumns = ['next_review_at', 'label_status', 'label_requested_at'];
    for (const colName of newIndexColumns) {
      if (missingColumns.some((c) => c.name === colName)) {
        const indexName = `knowledge_items_${colName}_idx`;
        console.log(`[SchemaMigration] Creating index: ${indexName}`);
        try {
          await NitroSQLite.executeAsync(
            DB_NAME,
            `CREATE INDEX IF NOT EXISTS ${indexName} ON ${KNOWLEDGE_ITEMS_TABLE_NAME}(${colName});`
          );
          console.log(`[SchemaMigration] Created index: ${indexName}`);
        } catch (indexError) {
          console.warn(`[SchemaMigration] Failed to create index ${indexName}:`, indexError);
        }
      }
    }

    console.log('[SchemaMigration] Schema migration complete');
  } catch (error) {
    console.error('[SchemaMigration] Error:', error);
    throw error;
  }
}

function normalizeTags(rawValue: unknown): string[] | null | 'invalid' {
  if (rawValue === null) {
    return null;
  }

  if (typeof rawValue !== 'string') {
    return 'invalid';
  }

  const parsed = Effect.runSync(
    Effect.try({
      try: () => JSON.parse(rawValue),
      catch: () => null,
    })
  );

  if (!Array.isArray(parsed)) {
    return 'invalid';
  }

  const normalized = parsed
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag !== 'stub-tag');

  if (normalized.length === 0) {
    return null;
  }

  return [...new Set(normalized)];
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
      const normalizedTags = normalizeTags(row.tags);

      if (normalizedTags === 'invalid') {
        yield* Effect.promise(() =>
          NitroSQLite.executeAsync(
            DB_NAME,
            `UPDATE ${KNOWLEDGE_ITEMS_TABLE_NAME} SET tags = NULL WHERE id = ?;`,
            [row.id ?? null]
          )
        );
        continue;
      }

      const nextValue = normalizedTags === null ? null : JSON.stringify(normalizedTags);
      if (row.tags === nextValue) {
        continue;
      }

      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(
          DB_NAME,
          `UPDATE ${KNOWLEDGE_ITEMS_TABLE_NAME} SET tags = ? WHERE id = ?;`,
          [nextValue, row.id ?? null]
        )
      );
    }
  });

  return Effect.runPromise(program);
}
