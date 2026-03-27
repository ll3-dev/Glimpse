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

function getDefaultGenerateDeps(): GenerateRecommendationsDeps {
  return {
    coreClient: mobileCoreClient,
    getWeeklyItems,
  };
}

function getDefaultSaveDeps(): SaveRecommendationsDeps {
  return {
    coreClient: mobileCoreClient,
    nanoid: generateId,
    isIdCollisionError,
    maxIdCollisionRetries: MAX_ID_COLLISION_RETRIES,
  };
}

export function createGenerateRecommendations(
  deps: GenerateRecommendationsDeps = getDefaultGenerateDeps(),
) {
  return createGenerateRecommendationsUsecase(deps);
}

export function createSaveRecommendations(
  deps: SaveRecommendationsDeps = getDefaultSaveDeps(),
) {
  return createSaveRecommendationsUsecase(deps);
}

export function generateRecommendations(
  input?: Parameters<ReturnType<typeof createGenerateRecommendations>>[0]
) {
  return createGenerateRecommendations()(input);
}

export function saveRecommendations(
  recommendations: Parameters<ReturnType<typeof createSaveRecommendations>>[0]
) {
  return createSaveRecommendations()(recommendations);
}
