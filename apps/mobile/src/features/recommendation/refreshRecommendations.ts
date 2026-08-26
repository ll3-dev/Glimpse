import type { Recommendation } from '@glimpse/shared';
import { mobileCoreClient } from '@/src/features/core';
import { storage, StorageKeys } from '@/src/lib/storage';
import { logger } from '@/src/utils/logger';
import { generateRecommendations, saveRecommendations } from './generateRecommendations';
import { getCadence } from './updateRecommendationCadence';
import { proposeEdgesWithAI } from './proposeEdgesWithAI';
import type { GeneratedRecommendation } from './generateRecommendations.types';

const DEFAULT_GENERATION_LIMIT = 100;
const DEFAULT_SAVE_LIMIT = 10;

export interface RecommendationRefreshDeps {
  now: () => number;
  getCadence: () => number;
  getLastRefreshAt: () => number | null;
  setLastRefreshAt: (timestamp: number) => void;
  listRecommendations: () => Promise<Recommendation[]>;
  generate: (input: { since: number; limit: number }) => ReturnType<typeof generateRecommendations>;
  save: (recommendations: GeneratedRecommendation[]) => ReturnType<typeof saveRecommendations>;
  /** Optional LLM edge proposals merged on top of tag-overlap results. */
  proposeEdges?: (items: KnowledgeItemRef[]) => Promise<GeneratedRecommendation[]>;
  listWeeklyItems?: (since: number) => Promise<KnowledgeItemRef[]>;
}

type KnowledgeItemRef = {
  id: string;
  title: string | null;
  summary: string | null;
  tags: string[] | null;
  body?: string | null;
};

export type RecommendationRefreshResult =
  | { success: true; skipped: true; reason: 'not_due'; createdCount: 0 }
  | { success: true; skipped: false; createdCount: number; generatedCount: number }
  | { success: false; error: { code: string; message: string } };

function recommendationPairKey(itemAId: string, itemBId: string): string {
  return [itemAId, itemBId].sort().join('\u0000');
}

export function filterNewRecommendations(
  generated: GeneratedRecommendation[],
  existing: Recommendation[]
): GeneratedRecommendation[] {
  const existingPairs = new Set(
    existing.map((recommendation) =>
      recommendationPairKey(recommendation.itemA_id, recommendation.itemB_id)
    )
  );

  const nextPairs = new Set<string>();
  return generated.filter((recommendation) => {
    const key = recommendationPairKey(recommendation.itemAId, recommendation.itemBId);
    if (existingPairs.has(key) || nextPairs.has(key)) {
      return false;
    }
    nextPairs.add(key);
    return true;
  });
}

export function isRecommendationRefreshDue(
  now: number,
  lastRefreshAt: number | null,
  cadence: number
): boolean {
  return lastRefreshAt === null || now >= lastRefreshAt + cadence;
}

function getPersistedLastRefreshAt(): number | null {
  return storage.getNumber(StorageKeys.RECOMMENDATION_LAST_REFRESH_AT) ?? null;
}

function setPersistedLastRefreshAt(timestamp: number): void {
  storage.set(StorageKeys.RECOMMENDATION_LAST_REFRESH_AT, timestamp);
}

function getDefaultDeps(): RecommendationRefreshDeps {
  return {
    now: Date.now,
    getCadence,
    getLastRefreshAt: getPersistedLastRefreshAt,
    setLastRefreshAt: setPersistedLastRefreshAt,
    listRecommendations: () => mobileCoreClient.listRecommendations(),
    generate: generateRecommendations,
    save: saveRecommendations,
    listWeeklyItems: (since) => mobileCoreClient.listWeeklyKnowledgeItems(since),
    proposeEdges: (items) => proposeEdgesWithAI(items as never),
  };
}

export function createRefreshRecommendations(deps: RecommendationRefreshDeps) {
  return async (options: { force?: boolean } = {}): Promise<RecommendationRefreshResult> => {
    const now = deps.now();
    if (
      !options.force &&
      !isRecommendationRefreshDue(now, deps.getLastRefreshAt(), deps.getCadence())
    ) {
      return { success: true, skipped: true, reason: 'not_due', createdCount: 0 };
    }

    try {
      const generated = await deps.generate({
        since: now - 7 * 24 * 60 * 60 * 1000,
        limit: DEFAULT_GENERATION_LIMIT,
      });
      if (generated.success === false) {
        return { success: false, error: generated.error };
      }

      // AI edge proposals enrich tag overlap when a chat target is
      // configured; empty results (no model / failure) keep tag-only output.
      let aiEdges: GeneratedRecommendation[] = [];
      if (deps.proposeEdges && deps.listWeeklyItems) {
        try {
          const weeklyItems = await deps.listWeeklyItems(now - 7 * 24 * 60 * 60 * 1000);
          const proposed = await deps.proposeEdges(weeklyItems);
          aiEdges = proposed.map((edge) => ({
            itemAId: edge.itemAId,
            itemBId: edge.itemBId,
            reason: edge.reason,
          }));
        } catch (error) {
          logger.warn('AI edge proposal skipped', { error: String(error) });
        }
      }

      const existing = await deps.listRecommendations();
      const recommendations = filterNewRecommendations(
        [...aiEdges, ...generated.recommendations],
        existing
      ).slice(0, DEFAULT_SAVE_LIMIT);

      if (recommendations.length > 0) {
        const saved = await deps.save(recommendations);
        if (!saved.success) {
          return {
            success: false,
            error: saved.error ?? {
              code: 'RECOMMENDATION_ERROR',
              message: '추천 저장에 실패했습니다.',
            },
          };
        }
      }

      deps.setLastRefreshAt(now);
      return {
        success: true,
        skipped: false,
        createdCount: recommendations.length,
        generatedCount: generated.recommendations.length,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RECOMMENDATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  };
}

let refreshPromise: Promise<RecommendationRefreshResult> | null = null;

export function refreshRecommendations(
  options: { force?: boolean } = {}
): Promise<RecommendationRefreshResult> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = createRefreshRecommendations(getDefaultDeps())(options)
    .then((result) => {
      if (result.success === false) {
        logger.warn('Recommendation refresh failed', result.error);
      } else if (result.skipped === false) {
        logger.info('Recommendation refresh complete', {
          createdCount: result.createdCount,
          generatedCount: result.generatedCount,
        });
      }
      return result;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}
