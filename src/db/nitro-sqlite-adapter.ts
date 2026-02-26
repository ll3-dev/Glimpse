import { Effect } from 'effect';
import { appError, tryPromise } from '@/src/lib/effect-result';
import { handleKnowledgeItemsInsert, handleKnowledgeItemsSelect } from './web-adapter/handlers';
import type { WebQueryMethod, WebQueryResult } from './web-adapter/types';

function isKnowledgeItemsSelect(sqlLower: string): boolean {
  return (
    sqlLower.includes('from "knowledge_items"') ||
    sqlLower.includes('from knowledge_items')
  );
}

function isKnowledgeItemsInsert(sqlLower: string): boolean {
  return (
    sqlLower.includes('into "knowledge_items"') ||
    sqlLower.includes('into knowledge_items')
  );
}

export async function nitroSQLiteCallback(
  sql: string,
  params: (string | number | boolean | null | ArrayBuffer)[],
  method: WebQueryMethod
): Promise<WebQueryResult> {
  const program = Effect.gen(function* () {
    const sqlLower = sql.toLowerCase().trim();

    if (sqlLower.startsWith('select')) {
      if (isKnowledgeItemsSelect(sqlLower)) {
        return handleKnowledgeItemsSelect(method);
      }
      return yield* Effect.fail(
        appError('DATABASE_ERROR', 'Unsupported SELECT query on web adapter', {
          method,
          sql,
        })
      );
    }

    if (sqlLower.startsWith('insert')) {
      if (!isKnowledgeItemsInsert(sqlLower)) {
        return yield* Effect.fail(
          appError('DATABASE_ERROR', 'Unsupported INSERT query on web adapter', {
            method,
            sql,
          })
        );
      }
      return yield* handleKnowledgeItemsInsert(params);
    }

    return yield* Effect.fail(
      appError('DATABASE_ERROR', 'Unsupported query on web adapter', {
        method,
        sql,
      })
    );
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(appError('DATABASE_ERROR', 'Web sqlite callback failed', error))
    )
  );

  return Effect.runPromise(program);
}

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
