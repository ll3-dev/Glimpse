import type {
  NitroSQLiteConnection,
  QueryResultRow,
  SQLiteQueryParams,
} from "react-native-nitro-sqlite";
import { entityKind } from "drizzle-orm/entity";
import { DefaultLogger, NoopLogger, type Logger } from "drizzle-orm/logger";
import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
  type ExtractTablesWithRelations,
  type RelationalSchemaConfig,
  type TablesRelationalConfig,
} from "drizzle-orm/relations";
import {
  fillPlaceholders,
  sql,
  type Query,
} from "drizzle-orm/sql/sql";
import { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core/db";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core/dialect";
import type { SelectedFieldsOrdered } from "drizzle-orm/sqlite-core/query-builders/select.types";
import { SQLiteTransaction } from "drizzle-orm/sqlite-core/session";
import {
  SQLitePreparedQuery,
  SQLiteSession,
  type PreparedQueryConfig as PreparedQueryConfigBase,
  type SQLiteExecuteMethod,
  type SQLiteTransactionConfig,
} from "drizzle-orm/sqlite-core/session";
import type { DrizzleConfig } from "drizzle-orm/utils";

type NitroSQLiteRunResult = {
  changes: number;
  lastInsertRowId?: number;
};

type PreparedQueryConfig = Omit<PreparedQueryConfigBase, "run">;

type SessionInternals = {
  dialect: SQLiteSyncDialect;
};

type TransactionInternals<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
> = {
  dialect: SQLiteSyncDialect;
  session: NitroSQLiteSession<TFullSchema, TSchema>;
};

type Decodable = {
  mapFromDriverValue(value: unknown): unknown;
};

type SelectedFieldEntry = SelectedFieldsOrdered[number];

export interface NitroSQLiteSessionOptions {
  logger?: Logger;
}

const toSQLiteParams = (params: unknown[]): SQLiteQueryParams =>
  params as SQLiteQueryParams;

const valuesFromResultRow = (row: QueryResultRow): unknown[] =>
  Object.values(row).map((value) =>
    value && typeof value === "object" && "isNitroSQLiteNull" in value
      ? null
      : value,
  );

const decodeFieldValue = (field: unknown, rawValue: unknown) => {
  if (rawValue === null) {
    return null;
  }
  if (
    typeof field === "object" &&
    field !== null &&
    "mapFromDriverValue" in field &&
    typeof field.mapFromDriverValue === "function"
  ) {
    return (field as Decodable).mapFromDriverValue(rawValue);
  }
  return rawValue;
};

const mapSelectedResultRow = (
  fields: SelectedFieldsOrdered,
  row: unknown[],
  joinsNotNullableMap?: Record<string, boolean>,
) => {
  const nullifyMap: Record<string, string | false> = {};
  const result: Record<string, unknown> = {};

  fields.forEach(({ path, field }: SelectedFieldEntry, columnIndex: number) => {
    let node: Record<string, unknown> = result;
    path.forEach((pathChunk, pathChunkIndex) => {
      if (pathChunkIndex < path.length - 1) {
        const current = node[pathChunk];
        if (
          typeof current !== "object" ||
          current === null ||
          Array.isArray(current)
        ) {
          node[pathChunk] = {};
        }
        node = node[pathChunk] as Record<string, unknown>;
        return;
      }

      const value = decodeFieldValue(field, row[columnIndex]);
      node[pathChunk] = value;

      if (joinsNotNullableMap && path.length === 2) {
        const objectName = path[0];
        if (!(objectName in nullifyMap)) {
          nullifyMap[objectName] = value === null ? objectName : false;
        }
      }
    });
  });

  if (joinsNotNullableMap && Object.keys(nullifyMap).length > 0) {
    Object.entries(nullifyMap).forEach(([objectName, tableName]) => {
      if (typeof tableName === "string" && !joinsNotNullableMap[tableName]) {
        result[objectName] = null;
      }
    });
  }

  return result;
};

export class NitroSQLiteSession<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
> extends SQLiteSession<"sync", NitroSQLiteRunResult, TFullSchema, TSchema> {
  static readonly [entityKind] = "NitroSQLiteSession";

  private logger: Logger;

  constructor(
    private client: NitroSQLiteConnection,
    dialect: SQLiteSyncDialect,
    private schema: RelationalSchemaConfig<TSchema> | undefined,
    options: NitroSQLiteSessionOptions = {},
  ) {
    super(dialect);
    this.logger = options.logger ?? new NoopLogger();
  }

  prepareQuery<T extends Omit<PreparedQueryConfig, "run">>(
    query: Query,
    fields: SelectedFieldsOrdered | undefined,
    executeMethod: SQLiteExecuteMethod,
    isResponseInArrayMode: boolean,
    customResultMapper?: (
      rows: unknown[][],
      mapColumnValue?: (value: unknown) => unknown,
    ) => unknown,
  ): NitroSQLitePreparedQuery<T> {
    return new NitroSQLitePreparedQuery<T>(
      this.client,
      query,
      this.logger,
      fields,
      executeMethod,
      isResponseInArrayMode,
      customResultMapper,
    );
  }

  transaction<T>(
    transaction: (tx: NitroSQLiteTransaction<TFullSchema, TSchema>) => T,
    config?: SQLiteTransactionConfig,
  ): T {
    const { dialect } = this as unknown as SessionInternals;
    const tx = new NitroSQLiteTransaction(
      "sync",
      dialect,
      this,
      this.schema,
    );
    this.run(sql.raw(`begin${config?.behavior ? ` ${config.behavior}` : ""}`));
    try {
      const result = transaction(tx);
      this.run(sql`commit`);
      return result;
    } catch (error) {
      this.run(sql`rollback`);
      throw error;
    }
  }
}

export class NitroSQLiteTransaction<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
> extends SQLiteTransaction<
  "sync",
  NitroSQLiteRunResult,
  TFullSchema,
  TSchema
> {
  static readonly [entityKind] = "NitroSQLiteTransaction";

  transaction<T>(
    transaction: (tx: NitroSQLiteTransaction<TFullSchema, TSchema>) => T,
  ): T {
    const { dialect, session } = this as unknown as TransactionInternals<
      TFullSchema,
      TSchema
    >;
    const savepointName = `sp${this.nestedIndex}`;
    const tx = new NitroSQLiteTransaction<TFullSchema, TSchema>(
      "sync",
      dialect,
      session,
      this.schema,
      this.nestedIndex + 1,
    );
    session.run(sql.raw(`savepoint ${savepointName}`));
    try {
      const result = transaction(tx);
      session.run(sql.raw(`release savepoint ${savepointName}`));
      return result;
    } catch (error) {
      session.run(sql.raw(`rollback to savepoint ${savepointName}`));
      throw error;
    }
  }
}

export class NitroSQLitePreparedQuery<
  T extends PreparedQueryConfig = PreparedQueryConfig,
> extends SQLitePreparedQuery<{
  type: "sync";
  run: NitroSQLiteRunResult;
  all: T["all"];
  get: T["get"];
  values: T["values"];
  execute: T["execute"];
}> {
  static readonly [entityKind] = "NitroSQLitePreparedQuery";
  protected joinsNotNullableMap?: Record<string, boolean>;

  constructor(
    private client: NitroSQLiteConnection,
    query: Query,
    private logger: Logger,
    private fields: SelectedFieldsOrdered | undefined,
    executeMethod: SQLiteExecuteMethod,
    private _isResponseInArrayMode: boolean,
    private customResultMapper?: (
      rows: unknown[][],
      mapColumnValue?: (value: unknown) => unknown,
    ) => unknown,
  ) {
    super("sync", executeMethod, query);
  }

  run(placeholderValues?: Record<string, unknown>): NitroSQLiteRunResult {
    const params = toSQLiteParams(
      fillPlaceholders(this.query.params, placeholderValues ?? {}),
    );
    this.logger.logQuery(this.query.sql, params);
    const result = this.client.execute(this.query.sql, params);
    return {
      changes: result.rowsAffected,
      lastInsertRowId: result.insertId,
    };
  }

  all(placeholderValues?: Record<string, unknown>): T["all"] {
    const { fields, joinsNotNullableMap, query, logger, customResultMapper } =
      this;
    if (!fields && !customResultMapper) {
      const params = toSQLiteParams(
        fillPlaceholders(query.params, placeholderValues ?? {}),
      );
      logger.logQuery(query.sql, params);
      const result = this.client.execute(query.sql, params);
      return (result.rows?._array ?? []) as T["all"];
    }

    const rows = this.values(placeholderValues) as unknown[][];
    if (customResultMapper) {
      return customResultMapper(rows) as T["all"];
    }

    return rows.map((row) =>
      mapSelectedResultRow(fields!, row, joinsNotNullableMap),
    ) as T["all"];
  }

  get(placeholderValues?: Record<string, unknown>): T["get"] {
    const params = toSQLiteParams(
      fillPlaceholders(this.query.params, placeholderValues ?? {}),
    );
    this.logger.logQuery(this.query.sql, params);
    const { fields, joinsNotNullableMap, customResultMapper } = this;

    if (!fields && !customResultMapper) {
      const result = this.client.execute(this.query.sql, params);
      return result.rows?.item(0) as T["get"];
    }

    const rows = this.values(placeholderValues) as unknown[][];
    const row = rows[0];
    if (!row) {
      return undefined as T["get"];
    }
    if (customResultMapper) {
      return customResultMapper([row]) as T["get"];
    }

    return mapSelectedResultRow(fields!, row, joinsNotNullableMap) as T["get"];
  }

  values(placeholderValues?: Record<string, unknown>): T["values"] {
    const params = toSQLiteParams(
      fillPlaceholders(this.query.params, placeholderValues ?? {}),
    );
    this.logger.logQuery(this.query.sql, params);
    const result = this.client.execute(this.query.sql, params);

    if (!result.rows) {
      return [] as T["values"];
    }

    const rows: unknown[][] = [];
    for (let index = 0; index < result.rows.length; index += 1) {
      const row = result.rows.item(index);
      if (row) {
        rows.push(valuesFromResultRow(row));
      }
    }
    return rows as T["values"];
  }

  /** @internal */
  isResponseInArrayMode(): boolean {
    return this._isResponseInArrayMode;
  }
}

export class NitroSQLiteDatabase<
  TSchema extends Record<string, unknown> = Record<string, never>,
> extends BaseSQLiteDatabase<"sync", NitroSQLiteRunResult, TSchema> {
  static readonly [entityKind] = "NitroSQLiteDatabase";
}

export function drizzle<TSchema extends Record<string, unknown> = Record<string, never>>(
  connection: NitroSQLiteConnection,
  config: DrizzleConfig<TSchema> = {},
): NitroSQLiteDatabase<TSchema> & { $client: NitroSQLiteConnection } {
  const dialect = new SQLiteSyncDialect({ casing: config.casing });
  let logger: Logger | undefined;

  if (config.logger === true) {
    logger = new DefaultLogger();
  } else if (config.logger !== false) {
    logger = config.logger;
  }

  let schema:
    | RelationalSchemaConfig<ExtractTablesWithRelations<TSchema>>
    | undefined;
  if (config.schema) {
    const tablesConfig = extractTablesRelationalConfig(
      config.schema,
      createTableRelationsHelpers,
    );

    schema = {
      fullSchema: config.schema,
      schema: tablesConfig.tables as ExtractTablesWithRelations<TSchema>,
      tableNamesMap: tablesConfig.tableNamesMap,
    };
  }

  const session = new NitroSQLiteSession<
    TSchema,
    ExtractTablesWithRelations<TSchema>
  >(
    connection,
    dialect,
    schema as
      | RelationalSchemaConfig<ExtractTablesWithRelations<TSchema>>
      | undefined,
    { logger },
  );
  const db = new NitroSQLiteDatabase<TSchema>("sync", dialect, session, schema);

  return Object.assign(db, { $client: connection }) as NitroSQLiteDatabase<TSchema> & {
    $client: NitroSQLiteConnection;
  };
}
