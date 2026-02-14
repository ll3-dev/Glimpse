import { drizzle } from 'drizzle-orm/nitro-sqlite';
import { NitroSQLite } from 'react-native-nitro-sqlite';
import * as schema from './schema';

// Database name for local storage
const DB_NAME = 'glimpse.db';

// Initialize the database connection
const sqlite = NitroSQLite.openDatabase(DB_NAME);

// Create drizzle ORM instance
export const db = drizzle(sqlite, { schema });

// Re-export schema types and tables
export * from './schema';
