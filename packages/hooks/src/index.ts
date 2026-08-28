// Core
export { CoreClientContext, useCoreClient, useOptionalCoreClient } from './core-client-context';
export { GlimpseProvider } from './provider';
export { queryClient } from './query-client';

// Query Keys
export { queryKeys } from './query-keys';

// Queries
export { useKnowledgeItemsQuery } from './queries/useKnowledgeItems';
export { useConversationsQuery } from './queries/useConversations';
export { useMessagesQuery } from './queries/useMessages';
export { useDueItemsQuery } from './queries/useDueItems';
export { useRecommendationsQuery } from './queries/useRecommendations';
export { useReviewReminderScheduler } from './queries/useReviewReminder';
export { useLabelingBackfill } from './queries/useLabelingBackfill';

// Mutations
export { useSaveKnowledgeItemMutation, useUpdateKnowledgeItemMutation } from './mutations/useKnowledgeItemMutations';
export {
  useCreateConversationMutation,
  useUpdateConversationMutation,
  useDeleteConversationMutation,
  useAddMessageMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
} from './mutations/useChatMutations';
export {
  scheduleNextReview,
  useMarkAsReviewedMutation,
  useMarkAsForgottenMutation,
  usePostponeReviewMutation,
} from './mutations/useReviewMutations';
export { useRespondToRecommendationMutation, useLogFeedbackMutation } from './mutations/useRecommendationMutations';

// Search
export {
  useSemanticRerank,
  itemEmbeddingText,
  embeddingCacheKey,
  MAX_EMBED_ITEMS,
  SEMANTIC_RERANK_DEBOUNCE_MS,
} from './search/useSemanticRerank';
export type {
  SemanticEmbedRequest,
  SemanticEmbedDeps,
} from './search/useSemanticRerank';
