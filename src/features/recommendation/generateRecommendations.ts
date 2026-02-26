import { db, recommendations } from "@/src/db";
import { generateId } from "@/src/lib/id";
import { getWeeklyItems } from "./getWeeklyItems";
import { createGenerateRecommendations as createGenerateRecommendationsUsecase } from "./generateRecommendations.usecase";
import { createSaveRecommendations as createSaveRecommendationsUsecase } from "./saveRecommendations.usecase";
import type {
  GenerateRecommendationsDeps,
  SaveRecommendationsDeps,
} from "./generateRecommendations.types";

export type {
  GenerateFailureResult,
  GenerateRecommendationsResult,
  GenerateRecommendationsDeps,
  GenerateResult,
  GeneratedRecommendation,
  SaveRecommendationsDeps,
} from "./generateRecommendations.types";

const defaultGenerateDeps: GenerateRecommendationsDeps = {
  db,
  recommendations,
  getWeeklyItems,
};

const defaultSaveDeps: SaveRecommendationsDeps = {
  db,
  recommendations,
  nanoid: generateId,
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
