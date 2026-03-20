/**
 * Filter Knowledge Items
 *
 * Client-side filtering for knowledge items based on search query.
 * Filters by title, body, and tags.
 *
 * Uses @toss/hangul for better Korean search matching:
 * - 초성 검색 (e.g., "ㅌㅅ" -> "토스")
 * - 한글 분해 기반 검색 (e.g., "톳" -> "토스")
 */

import { chosungIncludes, hangulIncludes } from '@toss/hangul';
import type { KnowledgeItem } from '@glimpse/shared';

/**
 * Filters knowledge items by search query.
 *
 * This function:
 * 1. Converts search query to lowercase for case-insensitive matching
 * 2. Checks if query exists in title, body, or any tag
 * 3. Returns all items if search query is empty
 *
 * @param items - Array of knowledge items to filter
 * @param query - Search query string (can be empty)
 * @returns Filtered array of knowledge items
 *
 * @example
 * // Search for items containing 'react'
 * const filtered = filterKnowledgeItems(items, 'react');
 *
 * // Empty query returns all items
 * const all = filterKnowledgeItems(items, '');
 */
export function filterKnowledgeItems(
  items: KnowledgeItem[],
  query: string,
): KnowledgeItem[] {
  // Return all items if query is empty or only whitespace
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

  // Filter items where query exists in title, body, or tags
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
