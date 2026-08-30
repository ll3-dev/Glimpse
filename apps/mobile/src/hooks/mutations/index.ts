/**
 * Mutation Hooks
 *
 * React Query hooks for data mutations.
 */

export {
  useMarkAsForgottenMutation,
  useMarkAsReviewedMutation,
  usePostponeReviewMutation,
  useReviewActionsMutation,
} from './useReviewActions';

export {
  useRespondToRecommendationMutation,
  useRecommendationActionsMutation,
} from './useRecommendationActions';

export {
  useSaveKnowledgeItemMutation,
  useUpdateKnowledgeItemMutation,
  useDeleteKnowledgeItemMutation,
} from './useCaptureActions';

export {
  useCreateConversationMutation,
  useAddMessageMutation,
  useDeleteConversationMutation,
  useUpdateConversationDetailsMutation,
  useUpdateConversationTitleMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
} from './useChatMutations';
