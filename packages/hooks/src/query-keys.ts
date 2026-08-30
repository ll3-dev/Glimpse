export const queryKeys = {
  knowledgeItems: {
    all: ['knowledgeItems'] as const,
    list: (filters?: { type?: string }) =>
      [...queryKeys.knowledgeItems.all, 'list', filters] as const,
    detail: (id: string) =>
      [...queryKeys.knowledgeItems.all, 'detail', id] as const,
  },
  review: {
    all: ['review'] as const,
    dueItems: ['review', 'dueItems'] as const,
    dueItemsList: (options?: { limit?: number }) =>
      [...queryKeys.review.dueItems, options] as const,
  },
  recommendations: {
    all: ['recommendations'] as const,
    pending: ['recommendations', 'pending'] as const,
    graph: ['recommendations', 'graph'] as const,
  },
  chat: {
    all: ['chat'] as const,
    conversations: ['chat', 'conversations'] as const,
    conversation: (id: string) => ['chat', 'conversation', id] as const,
    messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
  },
} as const;
