import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { collectAvailableKnowledgeTags } from './collectAvailableKnowledgeTags';

function item(id: string, tags: string[], labels: string[]): KnowledgeItem {
  return {
    id, type: 'note', title: id, body: null, url: null, summary: null, tags, labels,
    createdAt: 1, updatedAt: 1, stability: null, difficulty: null,
    lastReviewedAt: null, nextReviewAt: null,
  };
}

describe('collectAvailableKnowledgeTags', () => {
  test('태그와 표시 라벨을 입력 순서로 중복 없이 모은다', () => {
    expect(collectAvailableKnowledgeTags([
      item('a', ['rust', 'graph'], ['idea']),
      item('b', ['graph'], ['idea', 'reference']),
    ])).toEqual(['rust', 'graph', 'idea', 'reference']);
  });
});
