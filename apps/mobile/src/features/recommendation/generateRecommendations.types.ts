import { type MobileCoreClient } from '@/src/features/core';
import { getWeeklyItems } from './getWeeklyItems';
import type { AppError } from '@/src/lib/effect-result';
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
  coreClient: Pick<MobileCoreClient, 'listRecommendations'>;
  getWeeklyItems: typeof getWeeklyItems;
}

export interface SaveRecommendationsDeps {
  coreClient: Pick<MobileCoreClient, 'saveRecommendations'>;
  nanoid: IdGenerator;
}
