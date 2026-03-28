import type { KnowledgeItem } from '@glimpse/shared';
import { filterKnowledgeItems, parseQueryToKeyword } from '../search';
import { getLibraryEmptyState, type LibraryEmptyState } from './getLibraryEmptyState';

export type ResolvedLibrarySearch = {
  keyword: string;
  filteredItems: KnowledgeItem[];
  emptyState: LibraryEmptyState;
};

export function resolveLibrarySearch(
  items: KnowledgeItem[] | undefined,
  searchQuery: string
): ResolvedLibrarySearch {
  const allItems = items ?? [];
  const keyword = parseQueryToKeyword(searchQuery);
  const filteredItems = filterKnowledgeItems(allItems, keyword);
  const emptyState = getLibraryEmptyState(searchQuery, allItems.length, filteredItems.length);

  return {
    keyword,
    filteredItems,
    emptyState,
  };
}
