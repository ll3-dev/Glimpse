/** Sort-order vocabulary shared by the library screen and its filter bar
 * (the sort chip renders the label for the current order). */
export type SortOrder = 'latest' | 'oldest' | 'title';

export const SORT_OPTIONS: { order: SortOrder; label: string }[] = [
  { order: 'latest', label: '최신순' },
  { order: 'oldest', label: '과거순' },
  { order: 'title', label: '가나다순' },
];
