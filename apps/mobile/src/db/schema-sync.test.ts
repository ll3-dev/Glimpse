/**
 * Schema Synchronization Test
 *
 * This test ensures that constants.ts stays in sync with schema.ts.
 * If you add a column to the Drizzle schema, you MUST update constants.ts.
 *
 * This test will fail if they diverge, preventing the bug we just fixed.
 */

import { describe, it, expect } from 'bun:test';
import { knowledgeItems, recommendations, feedbackEvents, conversations, messages } from './schema';
import {
  CONVERSATIONS_SELECT_COLUMNS,
  MESSAGES_SELECT_COLUMNS,
  KNOWLEDGE_ITEMS_SELECT_COLUMNS,
  REQUIRED_CONVERSATION_COLUMNS,
  REQUIRED_MESSAGE_COLUMNS,
  RECOMMENDATIONS_SELECT_COLUMNS,
  FEEDBACK_EVENTS_SELECT_COLUMNS,
  REQUIRED_COLUMNS,
  CREATE_KNOWLEDGE_ITEMS_TABLE_SQL,
  CREATE_INDEXES_SQL,
} from './constants';
import { getTableColumns } from 'drizzle-orm/utils';

describe('Schema Synchronization', () => {
  it('knowledge_items SELECT columns should match schema', () => {
    const schemaColumns = Object.keys(getTableColumns(knowledgeItems)) as string[];
    const constantsColumns = [...KNOWLEDGE_ITEMS_SELECT_COLUMNS] as string[];

    // Both should have the same columns
    expect(schemaColumns.length).toBe(constantsColumns.length);

    // Each schema column should be in constants (snake_case)
    const schemaToDbName = (name: string) =>
      name.replace(/([A-Z])/g, '_$1').toLowerCase();

    for (const col of schemaColumns) {
      const dbName = schemaToDbName(col);
      expect(constantsColumns).toContain(dbName);
    }
  });

  it('REQUIRED_COLUMNS should include all non-id knowledge_items columns', () => {
    const schemaColumns = Object.keys(getTableColumns(knowledgeItems)) as string[];
    const schemaToDbName = (name: string) =>
      name.replace(/([A-Z])/g, '_$1').toLowerCase();

    const requiredNames = REQUIRED_COLUMNS.map((c) => c.name) as string[];

    for (const col of schemaColumns) {
      if (col === 'id') continue; // id is handled by CREATE TABLE
      const dbName = schemaToDbName(col);
      expect(requiredNames).toContain(dbName);
    }
  });

  it('recommendations SELECT columns should match schema', () => {
    const schemaColumns = Object.keys(getTableColumns(recommendations)) as string[];
    const constantsColumns = [...RECOMMENDATIONS_SELECT_COLUMNS] as string[];

    expect(schemaColumns.length).toBe(constantsColumns.length);

    const schemaToDbName = (name: string) =>
      name.replace(/([A-Z])/g, '_$1').toLowerCase();

    for (const col of schemaColumns) {
      const dbName = schemaToDbName(col);
      expect(constantsColumns).toContain(dbName);
    }
  });

  it('conversations SELECT columns should match schema', () => {
    const schemaColumns = Object.keys(getTableColumns(conversations)) as string[];
    const constantsColumns = [...CONVERSATIONS_SELECT_COLUMNS] as string[];

    expect(schemaColumns.length).toBe(constantsColumns.length);

    const schemaToDbName = (name: string) =>
      name.replace(/([A-Z])/g, '_$1').toLowerCase();

    for (const col of schemaColumns) {
      const dbName = schemaToDbName(col);
      expect(constantsColumns).toContain(dbName);
    }
  });

  it('messages SELECT columns should match schema', () => {
    const schemaColumns = Object.keys(getTableColumns(messages)) as string[];
    const constantsColumns = [...MESSAGES_SELECT_COLUMNS] as string[];

    expect(schemaColumns.length).toBe(constantsColumns.length);

    const schemaToDbName = (name: string) =>
      name.replace(/([A-Z])/g, '_$1').toLowerCase();

    for (const col of schemaColumns) {
      const dbName = schemaToDbName(col);
      expect(constantsColumns).toContain(dbName);
    }
  });

  it('feedback_events SELECT columns should match schema', () => {
    const schemaColumns = Object.keys(getTableColumns(feedbackEvents)) as string[];
    const constantsColumns = [...FEEDBACK_EVENTS_SELECT_COLUMNS] as string[];

    expect(schemaColumns.length).toBe(constantsColumns.length);

    const schemaToDbName = (name: string) =>
      name.replace(/([A-Z])/g, '_$1').toLowerCase();

    for (const col of schemaColumns) {
      const dbName = schemaToDbName(col);
      expect(constantsColumns).toContain(dbName);
    }
  });

  it('REQUIRED_CONVERSATION_COLUMNS should include all non-id conversations columns', () => {
    const schemaColumns = Object.keys(getTableColumns(conversations)) as string[];
    const schemaToDbName = (name: string) =>
      name.replace(/([A-Z])/g, '_$1').toLowerCase();

    const requiredNames = REQUIRED_CONVERSATION_COLUMNS.map((c) => c.name) as string[];

    for (const col of schemaColumns) {
      if (col === 'id') continue;
      const dbName = schemaToDbName(col);
      expect(requiredNames).toContain(dbName);
    }
  });

  it('REQUIRED_MESSAGE_COLUMNS should include all non-id messages columns', () => {
    const schemaColumns = Object.keys(getTableColumns(messages)) as string[];
    const schemaToDbName = (name: string) =>
      name.replace(/([A-Z])/g, '_$1').toLowerCase();

    const requiredNames = REQUIRED_MESSAGE_COLUMNS.map((c) => c.name) as string[];

    for (const col of schemaColumns) {
      if (col === 'id') continue;
      const dbName = schemaToDbName(col);
      expect(requiredNames).toContain(dbName);
    }
  });

  it('CREATE_KNOWLEDGE_ITEMS_TABLE_SQL should include all columns', () => {
    const requiredNames = KNOWLEDGE_ITEMS_SELECT_COLUMNS as readonly string[];

    for (const col of requiredNames) {
      expect(CREATE_KNOWLEDGE_ITEMS_TABLE_SQL).toContain(col);
    }
  });

  it('knowledge_items indexes should include mvp0 keys', () => {
    const indexSql = CREATE_INDEXES_SQL.join('\n');
    expect(indexSql).toContain('knowledge_items_type_idx');
    expect(indexSql).toContain('knowledge_items_created_at_idx');
  });
});
