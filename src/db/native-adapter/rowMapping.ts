import {
  FEEDBACK_EVENTS_SELECT_COLUMNS,
  FEEDBACK_EVENTS_TABLE_NAME,
  KNOWLEDGE_ITEMS_SELECT_COLUMNS,
  KNOWLEDGE_ITEMS_TABLE_NAME,
  RECOMMENDATIONS_SELECT_COLUMNS,
  RECOMMENDATIONS_TABLE_NAME,
} from '../constants';
import { Effect } from 'effect';
import type { NativeQueryMetadata, NativeQueryRow } from './types';

export function getOrderedColumnNames(
  sql: string,
  metadata: NativeQueryMetadata | undefined,
  results: NativeQueryRow[]
): string[] {
  const sqlLower = sql.toLowerCase();

  if (
    sqlLower.includes(`from "${KNOWLEDGE_ITEMS_TABLE_NAME}"`) ||
    sqlLower.includes(`from ${KNOWLEDGE_ITEMS_TABLE_NAME}`)
  ) {
    return [...KNOWLEDGE_ITEMS_SELECT_COLUMNS];
  }

  if (
    sqlLower.includes(`from "${RECOMMENDATIONS_TABLE_NAME}"`) ||
    sqlLower.includes(`from ${RECOMMENDATIONS_TABLE_NAME}`)
  ) {
    return [...RECOMMENDATIONS_SELECT_COLUMNS];
  }

  if (
    sqlLower.includes(`from "${FEEDBACK_EVENTS_TABLE_NAME}"`) ||
    sqlLower.includes(`from ${FEEDBACK_EVENTS_TABLE_NAME}`)
  ) {
    return [...FEEDBACK_EVENTS_SELECT_COLUMNS];
  }

  if (metadata && Object.keys(metadata).length > 0) {
    const orderedByMetadata = Object.values(metadata)
      .sort((a, b) => a.index - b.index)
      .map((column) => column.name);

    const firstRow = results[0];
    if (
      firstRow &&
      orderedByMetadata.length === Object.keys(firstRow).length &&
      orderedByMetadata.every((name) =>
        Object.prototype.hasOwnProperty.call(firstRow, name)
      )
    ) {
      return orderedByMetadata;
    }
  }

  const firstRow = results[0];
  return firstRow ? Object.keys(firstRow) : [];
}

export function mapRowToColumnArray(
  row: NativeQueryRow,
  orderedColumnNames: string[]
): unknown[] {
  if (orderedColumnNames.length === 0) {
    return Object.values(row);
  }

  return orderedColumnNames.map((columnName) => {
    const rawValue = Object.prototype.hasOwnProperty.call(row, columnName)
      ? row[columnName]
      : null;

    if (columnName === 'tags' && typeof rawValue === 'string') {
      const parsedTags = Effect.runSync(
        Effect.try({
          try: () => JSON.parse(rawValue),
          catch: () => null,
        })
      );

      if (parsedTags === null) {
        return null;
      }
    }

    return rawValue;
  });
}
