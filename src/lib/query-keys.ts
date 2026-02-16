/**
 * Query Keys Factory
 *
 * Centralized query key management for React Query.
 * Follows best practices for query key structure.
 */

export const queryKeys = {
  knowledgeItems: {
    all: ['knowledgeItems'] as const,
    list: (filters?: { type?: string }) =>
      [...queryKeys.knowledgeItems.all, 'list', filters] as const,
    detail: (id: string) =>
      [...queryKeys.knowledgeItems.all, 'detail', id] as const,
  },
  review: {
    dueItems: (options?: { limit?: number }) =>
      ['review', 'dueItems', options] as const,
  },
  recommendations: {
    pending: ['recommendations', 'pending'] as const,
    weekly: ['recommendations', 'weekly'] as const,
  },
} as const;
