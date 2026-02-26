import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';
import { nitroSQLiteCallback, nitroSQLiteBatchCallback } from './nitro-sqlite-adapter';

// Create drizzle ORM instance with nitro-sqlite adapter
export const db = drizzle(
  nitroSQLiteCallback,
  nitroSQLiteBatchCallback,
  { schema, logger: __DEV__ }
);

// Re-export schema types and tables
export * from './schema';
