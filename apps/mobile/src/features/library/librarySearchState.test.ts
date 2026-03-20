import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { resolveLibrarySearch } from './resolveLibrarySearch';

const baseItem: Omit<KnowledgeItem, 'id' | 'type'> = {
  title: null,
  body: null,
  url: null,
  summary: null,
  tags: null,
  createdAt: 0,
  updatedAt: 0,
  stability: null,
  difficulty: null,
  lastReviewedAt: null,
  nextReviewAt: null,
};

function item(partial: Partial<KnowledgeItem> & Pick<KnowledgeItem, 'id' | 'type'>): KnowledgeItem {
  return { ...baseItem, ...partial } as KnowledgeItem;
}

describe('library search state', () => {
  test('query-style search with no match maps to search-empty state', () => {
    const items = [
      item({ id: '1', type: 'note', title: 'React Basics', body: 'hooks' }),
      item({ id: '2', type: 'link', title: 'SQLite Tips', body: 'indexing' }),
    ];

    const result = resolveLibrarySearch(items, 'Swift 관련 있어?');

    expect(result.keyword).toBe('Swift');
    expect(result.filteredItems.length).toBe(0);
    expect(result.emptyState.title).toBe('검색 결과가 없습니다');
  });

  test('query-style search with no saved items maps to no-items state', () => {
    const result = resolveLibrarySearch([], 'React 관련 있어?');

    expect(result.keyword).toBe('React');
    expect(result.filteredItems.length).toBe(0);
    expect(result.emptyState.title).toBe('아직 저장된 지식이 없습니다');
  });
});
