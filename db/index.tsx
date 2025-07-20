import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

export const DATABASE_NAME = "glimpse.db";

export const db = drizzle(openDatabaseSync(DATABASE_NAME));
