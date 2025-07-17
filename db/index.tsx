import { drizzle } from "drizzle-orm/expo-sqlite";
import * as SQLite from "expo-sqlite";

export const db = drizzle(SQLite.openDatabaseSync("glimpse.db"));
