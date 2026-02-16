export type LibraryEmptyState = {
  title: string;
  description: string;
};

const NO_ITEMS_STATE: LibraryEmptyState = {
  title: '아직 저장된 지식이 없습니다',
  description: '수집 탭에서 메모나 링크를 저장해 보세요.',
};

const NO_SEARCH_RESULTS_STATE: LibraryEmptyState = {
  title: '검색 결과가 없습니다',
  description: '다른 키워드로 다시 검색해 보세요.',
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

