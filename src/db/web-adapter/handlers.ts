import { Effect } from 'effect';
import { getItems, reloadItems, saveItems, setItems } from './storage';
import type { StoredItem, WebQueryMethod, WebQueryResult } from './types';

function mapItemToRow(item: StoredItem): unknown[] {
  return [
    item.id,
    item.type,
    item.title,
    item.body,
    item.url,
    item.summary,
    JSON.stringify(item.tags),
    item.createdAt,
    item.updatedAt,
    item.stability,
    item.difficulty,
    item.lastReviewedAt,
    item.nextReviewAt,
  ];
}

export function handleKnowledgeItemsSelect(method: WebQueryMethod): WebQueryResult {
  const sortedItems = [...reloadItems()].sort((a, b) => b.createdAt - a.createdAt);

  if (method === 'all' || method === 'values') {
    return {
      rows: sortedItems.map((item) => mapItemToRow(item)),
    };
  }

  if (method === 'get') {
    const first = sortedItems[0];
    return { rows: first ? mapItemToRow(first) : [] };
  }

  return { rows: [] };
}

export function handleKnowledgeItemsInsert(
  params: (string | number | boolean | null | ArrayBuffer)[]
): Effect.Effect<WebQueryResult, unknown> {
  return Effect.gen(function* () {
    const [
      id,
      type,
      title,
      body,
      url,
      summary,
      tagsJson,
      createdAt,
      updatedAt,
      stability,
      difficulty,
      lastReviewedAt,
      nextReviewAt,
    ] = params as [
      string,
      string,
      string | null,
      string | null,
      string | null,
      string | null,
      string,
      number,
      number,
      number | null,
      number | null,
      number | null,
      number | null,
    ];

    const parsedTags = yield* Effect.try({
      try: () => (tagsJson ? (JSON.parse(tagsJson) as string[]) : null),
      catch: () => null,
    });

    const newItem: StoredItem = {
      id,
      type: type as StoredItem['type'],
      title,
      body,
      url,
      summary,
      tags: parsedTags,
      createdAt,
      updatedAt,
      stability: stability ?? null,
      difficulty: difficulty ?? null,
      lastReviewedAt: lastReviewedAt ?? null,
      nextReviewAt: nextReviewAt ?? null,
    };

    const nextItems = [...getItems(), newItem];
    setItems(nextItems);
    saveItems(nextItems);

    return {
      rows: [],
      changes: 1,
      lastInsertRowId: nextItems.length,
    };
  });
}
