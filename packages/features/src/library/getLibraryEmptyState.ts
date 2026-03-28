export type LibraryEmptyState = {
  title: string;
  description: string;
};

const NO_ITEMS_STATE: LibraryEmptyState = {
  title: 'No saved knowledge yet',
  description: 'Create a new entry to start building your knowledge base.',
};

const NO_SEARCH_RESULTS_STATE: LibraryEmptyState = {
  title: 'No search results',
  description: 'Try searching with a different keyword.',
};

export function getLibraryEmptyState(
  searchQuery: string,
  totalItems: number,
  filteredItemsCount: number
): LibraryEmptyState {
  if (totalItems <= 0) {
    return NO_ITEMS_STATE;
  }

  const hasQuery = searchQuery.trim().length > 0;
  if (hasQuery && filteredItemsCount === 0) {
    return NO_SEARCH_RESULTS_STATE;
  }

  return NO_ITEMS_STATE;
}
