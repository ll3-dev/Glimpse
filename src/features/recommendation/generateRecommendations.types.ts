import { nanoid } from 'nanoid';
import { db, recommendations, type KnowledgeItem } from '@/src/db';
import { getWeeklyItems } from './getWeeklyItems';
import type { AppError } from '@/src/lib/effect-result';

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
  db: typeof db;
  recommendations: typeof recommendations;
  getWeeklyItems: typeof getWeeklyItems;
}

export interface SaveRecommendationsDeps {
  db: typeof db;
  recommendations: typeof recommendations;
  nanoid: typeof nanoid;
}
