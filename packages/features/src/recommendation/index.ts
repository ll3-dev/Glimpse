/**
 * Recommendation Application Layer
 *
 * Platform-agnostic recommendation feature functions.
 */

import type { KnowledgeItem, RecommendationStatus, FeedbackActionType, CoreClient } from '@glimpse/shared';
import {
  buildFeedbackEvent,
  buildLogFeedbackEvent,
  buildRecommendationReason,
  buildRecommendationRecord,
  collectPendingRecommendationItemIds,
  countSharedTags,
  joinRecommendationsWithItems,
  toAppError,
  toTagOverlapInput,
  type GeneratedRecommendation,
  type RecommendationWithItems,
} from './helpers';
import type {
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
} from './types';

export * from './types';
export type { GeneratedRecommendation, RecommendationWithItems };

/**
 * How long a verdict stays in force. Preferences drift: a pair or tag the
 * user dismissed months ago deserves another chance instead of being blocked
 * forever by a stale first impression. Verdicts older than this window are
 * ignored entirely — expired rejections no longer block pairs, and expired
 * accepts stop counting toward the tag bar — so both directions age together.
 */
const VERDICT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function isVerdictExpired(at: number | null | undefined, now: number): boolean {
  if (at == null) return false;
  return now - at > VERDICT_WINDOW_MS;
}

/** Verdict clock for an edge: when the user acted on it, else when it arose. */
function edgeVerdictAt(edge: { createdAt: number; respondedAt: number | null }): number | null {
  return edge.respondedAt ?? edge.createdAt;
}

export async function calculateTagOverlap(
  coreClient: Pick<CoreClient, 'calculateTagOverlap'>,
  left: KnowledgeItem,
  right: KnowledgeItem
): Promise<number> {
  return coreClient.calculateTagOverlap(toTagOverlapInput(left, right));
}

export function createGenerateRecommendations(deps: GenerateRecommendationsDeps) {
  return async (
    input: { since: number; limit?: number; now?: number } = {
      since: Date.now() - 7 * 24 * 60 * 60 * 1000,
    }
  ): Promise<GenerateRecommendationsDepsResult> => {
    try {
      const now = input.now ?? Date.now();
      const weeklyItems = await deps.getWeeklyItems(input.since);
      if (weeklyItems.success === false) {
        return { success: false, error: weeklyItems.error };
      }

      // Quality feedback loop: never re-propose a pair the user already
      // judged, and let accepted/rejected tags raise/lower the bar for
      // tag-overlap matches. Without this, cadence only changes how often
      // the same bad suggestions return. Verdicts expire after
      // VERDICT_WINDOW_MS so stale judgments stop shaping new suggestions.
      const existing = deps.coreClient.listRecommendations
        ? await deps.coreClient.listRecommendations()
        : [];
      const feedback = deps.coreClient.listRecentFeedbackEvents
        ? await deps.coreClient.listRecentFeedbackEvents(200)
        : [];
      const existingPairs = new Set(
        existing.map((edge) => pairKey(edge.itemA_id, edge.itemB_id)),
      );
      // listRecentFeedbackEvents returns events created_at DESC; rebuilding
      // the map in ASC order makes the final insert per recommendation the
      // newest event, so the user's latest action wins.
      const feedbackOldestFirst = [...feedback].sort(
        (left, right) => left.createdAt - right.createdAt,
      );
      const verdictByRecommendation = new Map(
        feedbackOldestFirst.map((event) => [
          event.recommendationId,
          actionVerdict(event.action),
        ]),
      );
      const rejectedPairs = new Set<string>();
      const tagVerdicts = new Map<string, { accepted: number; rejected: number }>();
      for (const edge of existing) {
        const raw =
          statusVerdict(edge.status) ?? verdictByRecommendation.get(edge.id) ?? null;
        // An expired verdict no longer reflects preference: skip it entirely
        // (neither blocking the pair nor feeding the tag counters).
        const verdict =
          raw !== null && !isVerdictExpired(edgeVerdictAt(edge), now) ? raw : null;
        if (verdict === 'rejected') {
          rejectedPairs.add(pairKey(edge.itemA_id, edge.itemB_id));
        }
        if (verdict !== null) {
          const edgeItems = [
            weeklyItems.items.find((item) => item.id === edge.itemA_id),
            weeklyItems.items.find((item) => item.id === edge.itemB_id),
          ];
          const sharedTags = sharedTagsOf(edgeItems[0], edgeItems[1]);
          for (const tag of sharedTags) {
            const counts = tagVerdicts.get(tag) ?? { accepted: 0, rejected: 0 };
            counts[verdict === 'accepted' ? 'accepted' : 'rejected'] += 1;
            tagVerdicts.set(tag, counts);
          }
        }
      }

      const recommendations: GeneratedRecommendation[] = [];
      const items = weeklyItems.items;

      for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
          const itemA = items[leftIndex];
          const itemB = items[rightIndex];
          if (rejectedPairs.has(pairKey(itemA.id, itemB.id))) continue;
          if (existingPairs.has(pairKey(itemA.id, itemB.id))) continue;

          const overlapTags = sharedTagsOf(itemA, itemB);
          // A tag the user keeps rejecting must carry more shared tags to
          // still qualify; an accepted tag keeps the current low bar.
          const qualifies = overlapTags.some((tag) => {
            const counts = tagVerdicts.get(tag);
            if (!counts) return true;
            return counts.rejected <= counts.accepted;
          });

          if (overlapTags.length > 0 && qualifies) {
            recommendations.push({
              itemAId: itemA.id,
              itemBId: itemB.id,
              reason: buildRecommendationReason(overlapTags.length),
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

      return { success: true, recommendations };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}\u0000${right}` : `${right}\u0000${left}`;
}

function sharedTagsOf(
  left: KnowledgeItem | undefined,
  right: KnowledgeItem | undefined,
): string[] {
  if (!left?.tags || !right?.tags) return [];
  const rightSet = new Set(right.tags);
  return left.tags.filter((tag) => rightSet.has(tag));
}

function statusVerdict(status: string): 'accepted' | 'rejected' | null {
  if (status === 'accepted') return 'accepted';
  if (status === 'ignored' || status === 'dismissed') return 'rejected';
  return null;
}

/** Feedback actions use different names than statuses; normalize to verdicts. */
function actionVerdict(action: 'accept' | 'ignore' | 'dismiss'): 'accepted' | 'rejected' {
  return action === 'accept' ? 'accepted' : 'rejected';
}

export function createSaveRecommendations(deps: SaveRecommendationsDeps) {
  return async (
    recommendations: GeneratedRecommendation[]
  ): Promise<RecommendationSaveResult> => {
    try {
      const now = Date.now();
      const toSave = recommendations.map((recommendation) =>
        buildRecommendationRecord(recommendation, deps.nanoid(), now)
      );

      await deps.coreClient.saveRecommendations(toSave);
      return { success: true };
    } catch (error) {
      if (deps.isIdCollisionError(error)) {
        return { success: false, error: { code: 'ID_COLLISION', message: 'ID collision' } };
      }
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createGetWeeklyItems(deps: GetWeeklyItemsDeps) {
  return async (
    since: number = Date.now() - 7 * 24 * 60 * 60 * 1000
  ): Promise<WeeklyItemsResult> => {
    try {
      const items = await deps.coreClient.listWeeklyKnowledgeItems(since);
      return { success: true, items };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createGetPendingRecommendations(deps: GetPendingRecommendationsDeps) {
  return async (): Promise<PendingResult> => {
    try {
      const recommendations = await deps.coreClient.listPendingRecommendations();
      const itemIds = collectPendingRecommendationItemIds(recommendations);
      const items = await deps.coreClient.listKnowledgeItemsByIds(itemIds);

      return {
        success: true,
        recommendations: joinRecommendationsWithItems(recommendations, items),
      };
    } catch (error) {
      return { success: false, error: toAppError(error) };
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
      const event = buildFeedbackEvent(recommendationId, action, deps.nanoid(), Date.now());
      await deps.coreClient.respondToRecommendation(recommendationId, status, event);
      return { success: true, recommendationId };
    } catch (error) {
      return { success: false, error: toAppError(error), recommendationId };
    }
  };
}

export function createLogRecommendationFeedback(deps: RecommendationFeedbackDeps) {
  return async (
    event: Omit<import('@glimpse/shared').FeedbackEvent, 'id' | 'createdAt'>
  ): Promise<LogRecommendationFeedbackResult> => {
    try {
      const fullEvent = buildLogFeedbackEvent(event, deps.nanoid(), Date.now());
      const saved = await deps.coreClient.logRecommendationFeedback(fullEvent);
      return { success: true, event: saved, eventId: saved.id };
    } catch (error) {
      if (deps.isIdCollisionError(error)) {
        return { success: false, error: { code: 'ID_COLLISION', message: 'ID collision' } };
      }
      return { success: false, error: toAppError(error) };
    }
  };
}

export function createGetRecentFeedbackEvents(deps: RecommendationFeedbackDeps) {
  return async (limit: number = 50): Promise<GetRecentFeedbackResult> => {
    try {
      const events = await deps.coreClient.listRecentFeedbackEvents(limit);
      return { success: true, events };
    } catch (error) {
      return { success: false, error: toAppError(error) };
    }
  };
}
