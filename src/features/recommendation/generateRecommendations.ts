/**
 * Generate Recommendations Use Case
 *
 * Creates connection recommendations between knowledge items based on tag similarity.
 * MVP v1: Simple tag overlap rule (stub implementation).
 */

import { nanoid } from 'nanoid';
import { db, recommendations, type KnowledgeItem, type NewRecommendation } from '@/src/db';
import { getWeeklyItems } from './getWeeklyItems';

export interface GeneratedRecommendation {
  itemA: KnowledgeItem;
  itemB: KnowledgeItem;
  reason: string;
}

export interface GenerateResult {
  success: true;
  data: GeneratedRecommendation[];
}

export interface GenerateFailureResult {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type GenerateRecommendationsResult = GenerateResult | GenerateFailureResult;

/**
 * Calculates tag overlap between two items.
 * Returns the number of common tags.
 */
function calculateTagOverlap(a: KnowledgeItem, b: KnowledgeItem): number {
  const tagsA = new Set(a.tags || []);
  const tagsB = new Set(b.tags || []);

  let overlap = 0;
  for (const tag of tagsA) {
    if (tagsB.has(tag)) overlap++;
  }
  return overlap;
}

/**
 * Generates connection recommendations from weekly items.
 * Uses simple tag overlap as the recommendation rule.
 */
export async function generateRecommendations(): Promise<GenerateRecommendationsResult> {
  try {
    // Get items from last 7 days
    const weeklyResult = await getWeeklyItems();
    if (!weeklyResult.success) {
      return weeklyResult;
    }

    const items = weeklyResult.data;

    // Need at least 2 items to make recommendations
    if (items.length < 2) {
      return {
        success: true,
        data: [],
      };
    }

    // Get existing recommendations to avoid duplicates
    const existingRecommendations = await db
      .select()
      .from(recommendations);

    const existingPairs = new Set(
      existingRecommendations.map((r) => `${r.itemA_id}-${r.itemB_id}`)
    );

    // Find pairs with tag overlap
    const candidates: GeneratedRecommendation[] = [];

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const itemA = items[i];
        const itemB = items[j];

        // Check if this pair already exists
        const pairKey = `${itemA.id}-${itemB.id}`;
        const reversePairKey = `${itemB.id}-${itemA.id}`;
        if (existingPairs.has(pairKey) || existingPairs.has(reversePairKey)) {
          continue;
        }

        // Calculate tag overlap
        const overlap = calculateTagOverlap(itemA, itemB);

        if (overlap > 0) {
          candidates.push({
            itemA,
            itemB,
            reason: `공통 태그 ${overlap}개`,
          });
        }
      }
    }

    // Sort by overlap count (descending) and take top recommendations
    // For MVP, we'll just return all candidates
    return {
      success: true,
      data: candidates,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'GENERATION_ERROR',
        message: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : error,
      },
    };
  }
}

/**
 * Saves recommendations to the database.
 */
export async function saveRecommendations(
  recommendationsList: GeneratedRecommendation[]
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const now = Date.now();

    const newRecommendations: NewRecommendation[] = recommendationsList.map((r) => ({
      id: nanoid(),
      itemA_id: r.itemA.id,
      itemB_id: r.itemB.id,
      reason: r.reason,
      status: 'pending' as const,
      createdAt: now,
      respondedAt: null,
    }));

    if (newRecommendations.length > 0) {
      await db.insert(recommendations).values(newRecommendations);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
