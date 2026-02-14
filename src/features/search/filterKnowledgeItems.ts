/**
 * Filter Knowledge Items
 *
 * Client-side filtering for knowledge items based on search query.
 * Filters by title, body, and tags (case-insensitive).
 */

import type { KnowledgeItem } from '@/src/db';

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

  // Convert query to lowercase for case-insensitive matching
  const lowerQuery = trimmedQuery.toLowerCase();

  // Filter items where query exists in title, body, or tags
  return items.filter((item) => {
    // Check title
    if (item.title && item.title.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Check body
    if (item.body && item.body.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Check tags (if they exist)
    if (item.tags && item.tags.length > 0) {
      return item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
    }

    // Check URL as fallback (useful for links)
    if (item.url && item.url.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    return false;
  });
}
