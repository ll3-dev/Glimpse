import {
  createGenerateRecommendations as createGenerateRecommendationsUsecase,
  createSaveRecommendations as createSaveRecommendationsUsecase,
  type GenerateRecommendationsDeps,
  type SaveRecommendationsDeps,
} from '@/src/features/core/application/recommendation';
import { mobileCoreClient } from '@/src/features/core';
import { generateId, isIdCollisionError, MAX_ID_COLLISION_RETRIES } from "@/src/lib/id";
import { getWeeklyItems } from "./getWeeklyItems";

export type {
  GenerateFailureResult,
  GenerateRecommendationsResult,
  GenerateRecommendationsDeps,
  GenerateResult,
  GeneratedRecommendation,
  SaveRecommendationsDeps,
} from "./generateRecommendations.types";

const defaultGenerateDeps: GenerateRecommendationsDeps = {
  coreClient: mobileCoreClient,
  getWeeklyItems,
};

const defaultSaveDeps: SaveRecommendationsDeps = {
  coreClient: mobileCoreClient,
  nanoid: generateId,
  isIdCollisionError,
  maxIdCollisionRetries: MAX_ID_COLLISION_RETRIES,
};

export function createGenerateRecommendations(
  deps: GenerateRecommendationsDeps = defaultGenerateDeps,
) {
  return createGenerateRecommendationsUsecase(deps);
}

export function createSaveRecommendations(
  deps: SaveRecommendationsDeps = defaultSaveDeps,
) {
  return createSaveRecommendationsUsecase(deps);
}

export const generateRecommendations = createGenerateRecommendations();
export const saveRecommendations = createSaveRecommendations();
