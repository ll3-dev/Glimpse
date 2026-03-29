export * from './library';
export * from './chat';
export * from './review';
export {
  // Re-export recommendation types, excluding AppError (already in chat/review)
  type GeneratedRecommendation,
  type RecommendationWithItems,
  calculateTagOverlap,
  createGenerateRecommendations,
  createSaveRecommendations,
  createGetWeeklyItems,
  createGetPendingRecommendations,
  createRespondToRecommendation,
  createLogRecommendationFeedback,
  createGetRecentFeedbackEvents,
} from './recommendation';
// Re-export recommendation types explicitly, excluding AppError
export type {
  GenerateRecommendationsDeps,
  GenerateRecommendationsDepsResult,
  GetWeeklyItemsDeps,
  WeeklyItemsResult,
  GetPendingRecommendationsDeps,
  PendingResult,
  RespondToRecommendationDeps,
  RespondToRecommendationResult,
  RecommendationFeedbackDeps,
  LogRecommendationFeedbackResult,
  GetRecentFeedbackResult,
  SaveRecommendationsDeps,
  RecommendationSaveResult,
  RecommendationAction,
  RecommendationFeedbackInput,
  type GeneratedRecommendation as GeneratedRecommendationType,
  type RecommendationWithItems as RecommendationWithItemsType,
} from './recommendation/types';
export * from './capture';
export * from './search';
