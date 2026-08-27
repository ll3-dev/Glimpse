import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import {
  computeGraphSourceDigest,
  GRAPH_INPUT_ITEMS,
  selectGraphSourceWindow,
} from './graph-source-window';

function item(id: string, updatedAt: number): KnowledgeItem {
  return {
    id,
    title: `title-${id}`,
    content: '',
    type: 'note',
    tags: [],
    embeddingSource: 'knowledge_item',
    createdAt: 0,
    updatedAt,
    labelStatus: 'labeled',
    labelSource: 'manual',
  };
}

describe('selectGraphSourceWindow', () => {
  test('returns newest items by updatedAt', () => {
    const items = [item('a', 1), item('b', 9), item('c', 5)];
    const windowed = selectGraphSourceWindow(items);
    expect(windowed.map((entry) => entry.id)).toEqual(['b', 'c', 'a']);
  });

  test('caps at GRAPH_INPUT_ITEMS', () => {
    const items = Array.from({ length: GRAPH_INPUT_ITEMS + 5 }, (_, index) =>
      item(`i${index}`, index),
    );
    expect(selectGraphSourceWindow(items)).toHaveLength(GRAPH_INPUT_ITEMS);
  });

  test('does not mutate the input array', () => {
    const items = [item('a', 1), item('b', 2)];
    selectGraphSourceWindow(items);
    expect(items.map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});

describe('computeGraphSourceDigest', () => {
  const base = [item('a', 1), item('b', 2)];

  test('is order-independent', () => {
    expect(computeGraphSourceDigest(base)).toBe(
      computeGraphSourceDigest([base[1], base[0]]),
    );
  });

  test('changes when an in-window item is edited', () => {
    expect(computeGraphSourceDigest(base)).not.toBe(
      computeGraphSourceDigest([item('a', 1), item('b', 3)]),
    );
  });

  test('ignores edits to items outside the window', () => {
    const withOlderEdit = [
      ...Array.from({ length: GRAPH_INPUT_ITEMS }, (_, index) => item(`i${index}`, index + 10)),
      item('ancient', 1),
    ];
    const afterAncientEdit = [
      ...Array.from({ length: GRAPH_INPUT_ITEMS }, (_, index) => item(`i${index}`, index + 10)),
      item('ancient', 2),
    ];
    expect(computeGraphSourceDigest(withOlderEdit)).toBe(
      computeGraphSourceDigest(afterAncientEdit),
    );
  });
});
