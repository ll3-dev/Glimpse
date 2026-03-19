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
import {
  ensureChatSchema,
  ensureKnowledgeItemsSchema,
  sanitizeKnowledgeItemsRows,
} from './schemaMaintenance';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

function isAlreadyOpenError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('already open');
}

function openDatabaseConnection(): void {
  try {
    NitroSQLite.open({ name: DB_NAME });
  } catch (error) {
    if (!isAlreadyOpenError(error)) {
      throw error;
    }
    NitroSQLite.close(DB_NAME);
    NitroSQLite.open({ name: DB_NAME });
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
  if (isInitialized) {
    return Promise.resolve();
  }

  if (!initPromise) {
    console.log('[InitDatabase] Initializing...');
    const initEffect = Effect.gen(function* () {
      openDatabaseConnection();

      // Create tables
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_KNOWLEDGE_ITEMS_TABLE_SQL)
      );
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_RECOMMENDATIONS_TABLE_SQL)
      );
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_FEEDBACK_EVENTS_TABLE_SQL)
      );
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_CONVERSATIONS_TABLE_SQL)
      );
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_MESSAGES_TABLE_SQL)
      );
      yield* Effect.promise(() =>
        NitroSQLite.executeAsync(DB_NAME, CREATE_EMBEDDINGS_TABLE_SQL)
      );

      // Run schema migration BEFORE creating indexes
      yield* Effect.promise(() => ensureKnowledgeItemsSchema());
      yield* Effect.promise(() => ensureChatSchema());

      // Create indexes (after all columns exist)
      for (const createIndexSql of CREATE_INDEXES_SQL) {
        yield* Effect.promise(() => executeNonCriticalStatement(createIndexSql));
      }

      yield* Effect.promise(() => sanitizeKnowledgeItemsRows());

      yield* Effect.sync(() => {
        isInitialized = true;
        console.log('[InitDatabase] Ready');
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
