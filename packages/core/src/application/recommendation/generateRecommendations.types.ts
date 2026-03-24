import type { AppError } from '../../foundation/effect-result';
import type { CoreClient } from '../../ports/core-client';
import type { KnowledgeItem } from '@glimpse/shared';

type IdGenerator = () => string;

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
  error: AppError;
}

export type GenerateRecommendationsResult = GenerateResult | GenerateFailureResult;

export interface GenerateRecommendationsDeps {
  coreClient: Pick<CoreClient, 'listRecommendations' | 'calculateTagOverlap'>;
  getWeeklyItems: () => Promise<{ success: true; data: KnowledgeItem[] } | { success: false; error: AppError }>;
}

export interface SaveRecommendationsDeps {
  coreClient: Pick<CoreClient, 'saveRecommendations'>;
  nanoid: IdGenerator;
  isIdCollisionError: (error: unknown) => boolean;
  maxIdCollisionRetries: number;
}
