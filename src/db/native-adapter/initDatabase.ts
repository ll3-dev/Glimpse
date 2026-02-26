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

export function initDatabase(): Promise<void> {
  if (isInitialized) {
    return Promise.resolve();
  }

  if (!initPromise) {
    const initEffect = Effect.gen(function* () {
      NitroSQLite.open({ name: DB_NAME });

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
      for (const createIndexSql of CREATE_INDEXES_SQL) {
        yield* Effect.promise(() => NitroSQLite.executeAsync(DB_NAME, createIndexSql));
      }

      yield* Effect.promise(() => ensureKnowledgeItemsSchema());
      yield* Effect.promise(() => sanitizeKnowledgeItemsRows());
      yield* Effect.sync(() => {
        isInitialized = true;
      });
    }).pipe(
      Effect.tapError(() =>
        Effect.sync(() => {
          initPromise = null;
        })
      )
    );

    initPromise = Effect.runPromise(initEffect);
  }

  return initPromise;
}
