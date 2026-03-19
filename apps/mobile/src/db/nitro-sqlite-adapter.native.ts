import { Effect } from "effect";
import { NitroSQLite } from "react-native-nitro-sqlite";
import { DB_NAME } from "./constants";
import { initDatabase } from "./native-adapter/initDatabase";
import {
  getOrderedColumnNames,
  mapRowToColumnArray,
} from "./native-adapter/rowMapping";
import type {
  NativeQueryMetadata,
  NativeQueryRow,
  NitroQueryMethod,
  NitroQueryResult,
} from "./native-adapter/types";

export async function nitroSQLiteCallback(
  sql: string,
  params: (string | number | boolean | null | ArrayBuffer)[],
  method: NitroQueryMethod,
): Promise<NitroQueryResult> {
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
          rows: typedResults.map((row) =>
            mapRowToColumnArray(row, orderedColumnNames),
          ),
        };

      case "get": {
        const firstRow = typedResults[0];
        return {
          rows: firstRow
            ? mapRowToColumnArray(firstRow, orderedColumnNames)
            : [],
        };
      }

      default:
        return { rows: result.results };
    }
  });

  return Effect.runPromise(program);
}

export async function nitroSQLiteBatchCallback(
  queries: { sql: string; params: unknown[] }[],
): Promise<{ rows: unknown[] }[]> {
  await initDatabase();
  await NitroSQLite.executeAsync(DB_NAME, "BEGIN IMMEDIATE TRANSACTION;");

  try {
    for (const query of queries) {
      await NitroSQLite.executeAsync(
        DB_NAME,
        query.sql,
        query.params as (string | number | boolean | null | ArrayBuffer)[],
      );
    }

    await NitroSQLite.executeAsync(DB_NAME, "COMMIT;");
    return queries.map(() => ({ rows: [] }));
  } catch (error) {
    try {
      await NitroSQLite.executeAsync(DB_NAME, "ROLLBACK;");
    } catch {
      // Rollback failure should not hide the original query failure.
    }
    throw error;
  }
}
