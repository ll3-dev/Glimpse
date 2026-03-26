/**
 * Recommendation Application Layer
 * Migrated from @glimpse/core/application/recommendation
 */

import type {
  KnowledgeItem,
  Recommendation,
  RecommendationStatus,
  FeedbackEvent,
  FeedbackActionType,
  CalculateTagOverlapInput,
  CoreClient,
} from '@glimpse/shared';

// ============================================================================
// Types
// ============================================================================

export interface GenerateRecommendationsDeps {
  coreClient: {
    listWeeklyKnowledgeItems: (since: number) => Promise<KnowledgeItem[]>;
  };
  getWeeklyItems: () => Promise<WeeklyItemsResult>;
}

export interface GenerateRecommendationsResult {
  recommendations: GeneratedRecommendation[];
}

export interface GeneratedRecommendation {
  itemAId: string;
  itemBId: string;
  reason: string;
}

export interface GenerateResult {
  ok: true;
  recommendations: GeneratedRecommendation[];
}

export interface GenerateFailureResult {
  ok: false;
  error: string;
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
  ok: true;
  items: KnowledgeItem[];
}

export interface WeeklyItemsFailureResult {
  ok: false;
  error: string;
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
  ok: true;
  recommendations: RecommendationWithItems[];
}

export interface PendingFailureResult {
  ok: false;
  error: string;
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

export interface RespondSuccessResult {
  ok: true;
}

export interface RespondFailureResult {
  ok: false;
  error: string;
}

export type RespondResult = RespondSuccessResult | RespondFailureResult;

// Proper discriminated union for RespondToRecommendation
export interface RespondToRecommendationSuccessResult {
  ok: true;
  recommendationId: string;
}

export interface RespondToRecommendationFailureResult {
  ok: false;
  error: string;
  recommendationId: string;
}

export type RespondToRecommendationResult =
  | RespondToRecommendationSuccessResult
  | RespondToRecommendationFailureResult;

export interface RecommendationFeedbackDeps {
  coreClient: {
    logRecommendationFeedback: (event: FeedbackEvent) => Promise<FeedbackEvent>;
    listRecentFeedbackEvents: (limit: number) => Promise<FeedbackEvent[]>;
  };
  nanoid: () => string;
  isIdCollisionError: (error: unknown) => boolean;
  maxIdCollisionRetries: number;
}

export interface LogFeedbackSuccessResult {
  ok: true;
  event: FeedbackEvent;
}

export interface LogFeedbackFailureResult {
  ok: false;
  error: string;
}

export type LogFeedbackResult = LogFeedbackSuccessResult | LogFeedbackFailureResult;

// Proper discriminated union for LogRecommendationFeedback
export interface LogRecommendationFeedbackSuccessResult {
  ok: true;
  event: FeedbackEvent;
  eventId?: string;
}

export interface LogRecommendationFeedbackFailureResult {
  ok: false;
  error: string;
  eventId?: string;
}

export type LogRecommendationFeedbackResult =
  | LogRecommendationFeedbackSuccessResult
  | LogRecommendationFeedbackFailureResult;

export interface RecentFeedbackSuccessResult {
  ok: true;
  events: FeedbackEvent[];
}

export interface RecentFeedbackFailureResult {
  ok: false;
  error: string;
}

export type RecentFeedbackResult = RecentFeedbackSuccessResult | RecentFeedbackFailureResult;

export type GetRecentFeedbackResult = RecentFeedbackResult;

export interface RecommendationSimilarityInput {
  itemA: KnowledgeItem;
  itemB: KnowledgeItem;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function calculateTagOverlap(
  coreClient: Pick<CoreClient, 'calculateTagOverlap'>,
  a: KnowledgeItem,
  b: KnowledgeItem
): number {
  const input: CalculateTagOverlapInput = {
    left: { tags: a.tags },
    right: { tags: b.tags },
  };
  return coreClient.calculateTagOverlap(input);
}

export function createGenerateRecommendations(deps: GenerateRecommendationsDeps) {
  return async (
    input: { since: number; limit?: number } = { since: Date.now() - 7 * 24 * 60 * 60 * 1000 }
  ): Promise<GenerateRecommendationsDepsResult> => {
    try {
      const result = await deps.getWeeklyItems();
      if (!result.ok) {
        return { ok: false, error: result.error };
      }

      const items = result.items;
      const recommendations: GeneratedRecommendation[] = [];

      // Simple pairwise similarity check
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const itemA = items[i];
          const itemB = items[j];

          // Check for tag overlap
          const tagsA = new Set(itemA.tags ?? []);
          const tagsB = new Set(itemB.tags ?? []);
          let overlap = 0;
          for (const tag of tagsA) {
            if (tagsB.has(tag)) overlap++;
          }

          if (overlap > 0) {
            recommendations.push({
              itemAId: itemA.id,
              itemBId: itemB.id,
              reason: `Shared ${overlap} tag(s)`,
            });
          }

          if (input.limit && recommendations.length >= input.limit) {
            break;
          }
        }
        if (input.limit && recommendations.length >= input.limit) {
          break;
        }
      }

      return { ok: true, recommendations };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  };
}

export function createSaveRecommendations(deps: SaveRecommendationsDeps) {
  return async (recommendations: GeneratedRecommendation[]): Promise<{ ok: boolean; error?: string }> => {
    try {
      const now = Date.now();
      const toSave: Recommendation[] = [];

      for (const rec of recommendations) {
        let retries = 0;
        while (retries < deps.maxIdCollisionRetries) {
          const id = deps.nanoid();
          const recommendation: Recommendation = {
            id,
            itemA_id: rec.itemAId,
            itemB_id: rec.itemBId,
            reason: rec.reason,
            status: 'pending',
            createdAt: now,
            respondedAt: null,
          };
          toSave.push(recommendation);
          break;
        }
      }

      await deps.coreClient.saveRecommendations(toSave);
      return { ok: true };
    } catch (error) {
      if (deps.isIdCollisionError(error)) {
        // Could retry, but for simplicity just fail
        return { ok: false, error: 'ID collision' };
      }
      return { ok: false, error: String(error) };
    }
  };
}

export function createGetWeeklyItems(deps: GetWeeklyItemsDeps) {
  return async (since: number = Date.now() - 7 * 24 * 60 * 60 * 1000): Promise<WeeklyItemsResult> => {
    try {
      const items = await deps.coreClient.listWeeklyKnowledgeItems(since);
      return { ok: true, items };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  };
}

export function createGetPendingRecommendations(deps: GetPendingRecommendationsDeps) {
  return async (): Promise<PendingResult> => {
    try {
      const recommendations = await deps.coreClient.listPendingRecommendations();
      const itemIds = new Set<string>();
      recommendations.forEach((r) => {
        itemIds.add(r.itemA_id);
        itemIds.add(r.itemB_id);
      });

      const items = await deps.coreClient.listKnowledgeItemsByIds(Array.from(itemIds));
      const itemMap = new Map(items.map((i) => [i.id, i]));

      const withItems: RecommendationWithItems[] = [];
      for (const rec of recommendations) {
        const itemA = itemMap.get(rec.itemA_id);
        const itemB = itemMap.get(rec.itemB_id);
        if (itemA && itemB) {
          withItems.push({ recommendation: rec, itemA, itemB });
        }
      }

      return { ok: true, recommendations: withItems };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  };
}

export function createRespondToRecommendation(deps: RespondToRecommendationDeps) {
  return async (
    recommendationId: string,
    status: RecommendationStatus,
    action: FeedbackActionType
  ): Promise<RespondToRecommendationResult> => {
    try {
      let retries = 0;
      let eventId: string;

      while (retries < deps.maxIdCollisionRetries) {
        eventId = deps.nanoid();
        const event: FeedbackEvent = {
          id: eventId,
          recommendationId,
          action,
          createdAt: Date.now(),
        };

        await deps.coreClient.respondToRecommendation(recommendationId, status, event);
        return { ok: true, recommendationId };
      }

      return { ok: false, error: 'Max retries exceeded', recommendationId };
    } catch (error) {
      return { ok: false, error: String(error), recommendationId };
    }
  };
}

export function createLogRecommendationFeedback(deps: RecommendationFeedbackDeps) {
  return async (event: Omit<FeedbackEvent, 'id' | 'createdAt'>): Promise<LogRecommendationFeedbackResult> => {
    try {
      let retries = 0;

      while (retries < deps.maxIdCollisionRetries) {
        const id = deps.nanoid();
        const fullEvent: FeedbackEvent = {
          ...event,
          id,
          createdAt: Date.now(),
        };

        const saved = await deps.coreClient.logRecommendationFeedback(fullEvent);
        return { ok: true, event: saved, eventId: saved.id };
      }

      return { ok: false, error: 'Max retries exceeded' };
    } catch (error) {
      if (deps.isIdCollisionError(error)) {
        return { ok: false, error: 'ID collision' };
      }
      return { ok: false, error: String(error) };
    }
  };
}

export function createGetRecentFeedbackEvents(deps: RecommendationFeedbackDeps) {
  return async (limit: number = 50): Promise<GetRecentFeedbackResult> => {
    try {
      const events = await deps.coreClient.listRecentFeedbackEvents(limit);
      return { ok: true, events };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  };
}
