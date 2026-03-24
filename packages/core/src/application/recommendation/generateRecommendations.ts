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

export function createGenerateRecommendations(
  deps: GenerateRecommendationsDeps,
) {
  return createGenerateRecommendationsUsecase(deps);
}

export function createSaveRecommendations(
  deps: SaveRecommendationsDeps,
) {
  return createSaveRecommendationsUsecase(deps);
}
