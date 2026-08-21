import type {
  KnowledgeItem,
  Recommendation,
  RecommendationStatus,
  FeedbackEvent,
  FeedbackActionType,
} from '@glimpse/shared';

export interface AppError {
  code: string;
  message: string;
}

export interface GeneratedRecommendation {
  itemAId: string;
  itemBId: string;
  reason: string;
}

export interface GenerateRecommendationsDeps {
  coreClient: {
    listWeeklyKnowledgeItems: (since: number) => Promise<KnowledgeItem[]>;
  };
  getWeeklyItems: (since?: number) => Promise<WeeklyItemsResult>;
}

export interface GenerateRecommendationsResult {
  recommendations: GeneratedRecommendation[];
}

export interface GenerateResult {
  success: true;
  recommendations: GeneratedRecommendation[];
}

export interface GenerateFailureResult {
  success: false;
  error: AppError;
}

export type GenerateRecommendationsDepsResult = GenerateResult | GenerateFailureResult;

export interface SaveRecommendationsDeps {
  coreClient: {
    saveRecommendations: (recommendations: Recommendation[]) => Promise<void>;
  };
  nanoid: () => string;
  isIdCollisionError: (error: unknown) => boolean;
  maxIdCollisionRetries: number;
}

export interface GetWeeklyItemsDeps {
  coreClient: {
    listWeeklyKnowledgeItems: (since: number) => Promise<KnowledgeItem[]>;
  };
}

export interface WeeklyItemsSuccessResult {
  success: true;
  items: KnowledgeItem[];
}

export interface WeeklyItemsFailureResult {
  success: false;
  error: AppError;
}

export type WeeklyItemsResult = WeeklyItemsSuccessResult | WeeklyItemsFailureResult;

export interface RecommendationWithItems {
  recommendation: Recommendation;
  itemA: KnowledgeItem;
  itemB: KnowledgeItem;
}

export interface GetPendingRecommendationsDeps {
  coreClient: {
    listPendingRecommendations: () => Promise<Recommendation[]>;
    listKnowledgeItemsByIds: (ids: string[]) => Promise<KnowledgeItem[]>;
  };
}

export interface PendingSuccessResult {
  success: true;
  recommendations: RecommendationWithItems[];
}

export interface PendingFailureResult {
  success: false;
  error: AppError;
}

export type PendingResult = PendingSuccessResult | PendingFailureResult;
export type GetPendingResult = PendingResult;

export interface RespondToRecommendationDeps {
  coreClient: {
    respondToRecommendation: (
      recommendationId: string,
      status: RecommendationStatus,
      event: FeedbackEvent
    ) => Promise<void>;
  };
  nanoid: () => string;
  isIdCollisionError: (error: unknown) => boolean;
  maxIdCollisionRetries: number;
}

export interface RespondToRecommendationSuccessResult {
  success: true;
  recommendationId: string;
}

export interface RespondToRecommendationFailureResult {
  success: false;
  error: AppError;
  recommendationId: string;
}

export type RespondToRecommendationResult =
  | RespondToRecommendationSuccessResult
  | RespondToRecommendationFailureResult;

export type RespondSuccessResult = RespondToRecommendationSuccessResult;
export type RespondFailureResult = RespondToRecommendationFailureResult;
export type RespondResult = RespondToRecommendationResult;

export interface RecommendationFeedbackDeps {
  coreClient: {
    logRecommendationFeedback: (event: FeedbackEvent) => Promise<FeedbackEvent>;
    listRecentFeedbackEvents: (limit: number) => Promise<FeedbackEvent[]>;
  };
  nanoid: () => string;
  isIdCollisionError: (error: unknown) => boolean;
  maxIdCollisionRetries: number;
}

export interface LogRecommendationFeedbackSuccessResult {
  success: true;
  event: FeedbackEvent;
  eventId?: string;
}

export interface LogRecommendationFeedbackFailureResult {
  success: false;
  error: AppError;
  eventId?: string;
}

export type LogRecommendationFeedbackResult =
  | LogRecommendationFeedbackSuccessResult
  | LogRecommendationFeedbackFailureResult;

export type LogFeedbackSuccessResult = LogRecommendationFeedbackSuccessResult;
export type LogFeedbackFailureResult = LogRecommendationFeedbackFailureResult;
export type LogFeedbackResult = LogRecommendationFeedbackResult;

export interface RecentFeedbackSuccessResult {
  success: true;
  events: FeedbackEvent[];
}

export interface RecentFeedbackFailureResult {
  success: false;
  error: AppError;
}

export type RecentFeedbackResult = RecentFeedbackSuccessResult | RecentFeedbackFailureResult;
export type GetRecentFeedbackResult = RecentFeedbackResult;

export type RecommendationSaveResult = { success: boolean; error?: AppError };

export type RecommendationAction = Omit<FeedbackEvent, 'id' | 'createdAt'>;

export type RecommendationFeedbackInput = FeedbackActionType;
