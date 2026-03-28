import { chosungIncludes, hangulIncludes } from '@toss/hangul';
import type { KnowledgeItem } from '@glimpse/shared';

export function filterKnowledgeItems(
  items: KnowledgeItem[],
  query: string,
): KnowledgeItem[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return items;
  }

  const lowerQuery = trimmedQuery.toLowerCase();

  function matchesText(value: string | null | undefined): boolean {
    if (!value) {
      return false;
    }

    if (value.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    return hangulIncludes(value, trimmedQuery) || chosungIncludes(value, trimmedQuery);
  }

  return items.filter((item) => {
    if (matchesText(item.title)) {
      return true;
    }

    if (matchesText(item.body)) {
      return true;
    }

    if (item.tags && item.tags.length > 0) {
      return item.tags.some((tag) => matchesText(tag));
    }

    if (matchesText(item.url)) {
      return true;
    }

    return false;
  });
}
