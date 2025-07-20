import { relations, sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const glintTable = sqliteTable("glint_table", {
  id: int().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  content: text().notNull(),
  importance: int().notNull().default(5),
  showedAt: int()
    .notNull()
    .default(sql`(current_timestamp)`),
  disabledAt: int()
    .notNull()
    .default(sql`(strftime('%s', 'now', '+7 days'))`),
  createdAt: int()
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: int()
    .notNull()
    .default(sql`(current_timestamp)`),
  deletedAt: int().notNull().default(0),
});

export const glintRelations = relations(glintTable, ({ many }) => ({
  tags: many(tagsTable),
}));

export const tagsTable = sqliteTable("tags_table", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  createdAt: int()
    .notNull()
    .default(sql`(current_timestamp)`),
  deletedAt: int().notNull().default(0),
});

export const tagsRelations = relations(tagsTable, ({ many }) => ({
  glints: many(glintTable),
}));

export const glintTagsTable = sqliteTable("glint_tags_table", {
  glintId: int()
    .notNull()
    .references(() => glintTable.id, { onDelete: "cascade" }),
  tagId: int()
    .notNull()
    .references(() => tagsTable.id, { onDelete: "cascade" }),
});

export const glintTagsRelations = relations(glintTagsTable, ({ one }) => ({
  glint: one(glintTable, {
    fields: [glintTagsTable.glintId],
    references: [glintTable.id],
  }),
  tag: one(tagsTable, {
    fields: [glintTagsTable.tagId],
    references: [tagsTable.id],
  }),
}));
