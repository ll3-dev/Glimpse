import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const glimpseTable = sqliteTable("glimpse_table", {
  id: int().primaryKey({ autoIncrement: true }),
  content: text().notNull(),
  createdAt: int()
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: int()
    .notNull()
    .default(sql`(current_timestamp)`),
  deletedAt: int().notNull().default(0),
});
