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
    JSON.stringify(item.labels ?? null),
    JSON.stringify(item.provisionalLabels ?? null),
    item.labelStatus ?? 'idle',
    item.labelSource ?? 'none',
    item.labelVersion ?? null,
    item.labelScore ?? null,
    item.labelRequestedAt ?? null,
    item.labelCompletedAt ?? null,
    item.labelError ?? null,
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
      labelsJson,
      provisionalLabelsJson,
      labelStatus,
      labelSource,
      labelVersion,
      labelScore,
      labelRequestedAt,
      labelCompletedAt,
      labelError,
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
      string | null,
      string | null,
      string | null,
      string | null,
      string | null,
      number | null,
      number | null,
      number | null,
      string | null,
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

    const parsedLabels = yield* Effect.try({
      try: () => (labelsJson ? (JSON.parse(labelsJson) as string[]) : null),
      catch: () => null,
    });

    const parsedProvisionalLabels = yield* Effect.try({
      try: () =>
        provisionalLabelsJson ? (JSON.parse(provisionalLabelsJson) as string[]) : null,
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
      labels: parsedLabels,
      provisionalLabels: parsedProvisionalLabels,
      labelStatus: labelStatus ?? 'idle',
      labelSource: labelSource ?? 'none',
      labelVersion: labelVersion ?? null,
      labelScore: labelScore ?? null,
      labelRequestedAt: labelRequestedAt ?? null,
      labelCompletedAt: labelCompletedAt ?? null,
      labelError: labelError ?? null,
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
