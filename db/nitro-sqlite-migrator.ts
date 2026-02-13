import { useEffect, useReducer } from "react";
import { sql } from "drizzle-orm/sql/sql";
import type { NitroSQLiteDatabase } from "./nitro-sqlite-adapter";

interface MigrationConfig {
  journal: {
    entries: {
      idx: number;
      when: number;
      tag: string;
      breakpoints: boolean;
    }[];
  };
  migrations: Record<string, string>;
}

interface MigrationState {
  success: boolean;
  error?: Error;
}

async function readMigrationFiles({ journal, migrations }: MigrationConfig) {
  const migrationQueries: {
    sql: string[];
    bps: boolean;
    folderMillis: number;
    hash: string;
  }[] = [];

  for await (const journalEntry of journal.entries) {
    const query = migrations[`m${journalEntry.idx.toString().padStart(4, "0")}`];
    if (!query) {
      throw new Error(`Missing migration: ${journalEntry.tag}`);
    }
    try {
      const result = query.split("--> statement-breakpoint");
      migrationQueries.push({
        sql: result,
        bps: journalEntry.breakpoints,
        folderMillis: journalEntry.when,
        hash: "",
      });
    } catch {
      throw new Error(`Failed to parse migration: ${journalEntry.tag}`);
    }
  }
  return migrationQueries;
}

async function migrate(
  db: NitroSQLiteDatabase<Record<string, unknown>>,
  config: MigrationConfig,
): Promise<void> {
  const migrations = await readMigrationFiles(config);

  // Create __drizzle_migrations table if it doesn't exist
  db.run(sql`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL UNIQUE,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  // Run each migration
  for (const migration of migrations) {
    // Check if migration was already applied
    const hash = `${migration.folderMillis}-${migration.sql.join("-")}`;
    const existing = db.get(
      sql`SELECT id FROM __drizzle_migrations WHERE hash = ${hash} LIMIT 1`,
    );
    if (existing) {
      continue; // Skip if already applied
    }

    // Execute migration statements
    for (const sqlStr of migration.sql) {
      if (sqlStr.trim()) {
        db.run(sql.raw(sqlStr));
      }
    }

    // Record migration
    db.run(sql`INSERT INTO __drizzle_migrations (hash) VALUES (${hash})`);
  }
}

export function useMigrations(
  db: NitroSQLiteDatabase<Record<string, unknown>>,
  migrations: MigrationConfig,
): MigrationState {
  const initialState: MigrationState = {
    success: false,
    error: undefined,
  };

  const fetchReducer = (
    state: MigrationState,
    action: { type: "migrating" | "migrated" | "error"; payload?: unknown },
  ): MigrationState => {
    switch (action.type) {
      case "migrating": {
        return { ...initialState };
      }
      case "migrated": {
        return { ...initialState, success: action.payload === true };
      }
      case "error": {
        return {
          ...initialState,
          error:
            action.payload instanceof Error
              ? action.payload
              : new Error(String(action.payload)),
        };
      }
      default: {
        return state;
      }
    }
  };

  const [state, dispatch] = useReducer(fetchReducer, initialState);

  useEffect(() => {
    dispatch({ type: "migrating" });
    migrate(db, migrations)
      .then(() => {
        dispatch({ type: "migrated", payload: true });
      })
      .catch((error) => {
        dispatch({ type: "error", payload: error });
      });
  }, [db, migrations]);

  return state;
}

export { migrate };
