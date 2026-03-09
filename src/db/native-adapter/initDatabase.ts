import { Effect } from 'effect';
import { NitroSQLite } from 'react-native-nitro-sqlite';
import {
  CREATE_INDEXES_SQL,
  CREATE_FEEDBACK_EVENTS_TABLE_SQL,
  CREATE_KNOWLEDGE_ITEMS_TABLE_SQL,
  CREATE_RECOMMENDATIONS_TABLE_SQL,
  CREATE_CONVERSATIONS_TABLE_SQL,
  CREATE_MESSAGES_TABLE_SQL,
  CREATE_EMBEDDINGS_TABLE_SQL,
  DB_NAME,
} from '../constants';
import { ensureKnowledgeItemsSchema, sanitizeKnowledgeItemsRows } from './schemaMaintenance';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

function isAlreadyOpenError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('already open');
}

function openDatabaseConnection(): void {
  try {
    NitroSQLite.open({ name: DB_NAME });
    console.log('[InitDatabase] Database opened');
  } catch (error) {
    if (!isAlreadyOpenError(error)) {
      throw error;
    }

    console.log('[InitDatabase] Database already open, resetting stale native connection...');
    NitroSQLite.close(DB_NAME);
    NitroSQLite.open({ name: DB_NAME });
    console.log('[InitDatabase] Database reopened');
  }
}

async function executeNonCriticalStatement(sql: string): Promise<void> {
  try {
    await NitroSQLite.executeAsync(DB_NAME, sql);
  } catch (error) {
    console.warn('[InitDatabase] Non-critical statement failed', { sql, error });
  }
}

export function initDatabase(): Promise<void> {
  console.log('[InitDatabase] Called, isInitialized:', isInitialized);

  if (isInitialized) {
    console.log('[InitDatabase] Already initialized, skipping');
    return Promise.resolve();
  }

  if (!initPromise) {
    console.log('[InitDatabase] Starting initialization...');
    const initEffect = Effect.gen(function* () {
      console.log('[InitDatabase] Opening database...');
      openDatabaseConnection();

      console.log('[InitDatabase] Creating knowledge_items table...');
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_KNOWLEDGE_ITEMS_TABLE_SQL)
      );
      console.log('[InitDatabase] Creating recommendations table...');
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_RECOMMENDATIONS_TABLE_SQL)
      );
      console.log('[InitDatabase] Creating feedback_events table...');
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_FEEDBACK_EVENTS_TABLE_SQL)
      );
      console.log('[InitDatabase] Creating conversations table...');
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_CONVERSATIONS_TABLE_SQL)
      );
      console.log('[InitDatabase] Creating messages table...');
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_MESSAGES_TABLE_SQL)
      );
      console.log('[InitDatabase] Creating embeddings table...');
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_EMBEDDINGS_TABLE_SQL)
      );

      // Run schema migration BEFORE creating indexes
      // This ensures all columns exist before we try to create indexes on them
      console.log('[InitDatabase] Running schema migration...');
      yield* Effect.promise(() => ensureKnowledgeItemsSchema());

      // Now create indexes (after all columns exist)
      console.log('[InitDatabase] Creating indexes...');
      for (const createIndexSql of CREATE_INDEXES_SQL) {
        console.log('[InitDatabase] Creating index statement:', createIndexSql);
        yield* Effect.promise(() => executeNonCriticalStatement(createIndexSql));
      }

      console.log('[InitDatabase] Sanitizing rows...');
      yield* Effect.promise(() => sanitizeKnowledgeItemsRows());
      console.log('[InitDatabase] Initialization complete!');
      yield* Effect.sync(() => {
        isInitialized = true;
      });
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          console.error('[InitDatabase] Initialization failed', error);
          initPromise = null;
        })
      )
    );

    initPromise = Effect.runPromise(initEffect);
  }

  return initPromise;
}
