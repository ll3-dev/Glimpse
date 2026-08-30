import { describe, it, expect } from "bun:test";
import {
  RECOMMENDED_MODELS,
  getModelById,
  isRecommendedModel,
} from "./model-list";
import { LOCAL_MODEL_REGISTRY } from "@glimpse/shared";

describe("RECOMMENDED_MODELS on mobile", () => {
  it("should only contain models compatible with mobile (platform: mobile or both)", () => {
    expect(RECOMMENDED_MODELS.length).toBeGreaterThan(0);

    for (const model of RECOMMENDED_MODELS) {
      const def = LOCAL_MODEL_REGISTRY.find((m) => m.id === model.id);
      expect(def).toBeDefined();
      expect(["mobile", "both"]).toContain(def!.platform);
    }
  });

  it("should NOT contain desktop-only models", () => {
    const desktopOnlyIds = LOCAL_MODEL_REGISTRY.filter(
      (m) => m.platform === "desktop",
    ).map((m) => m.id);

    expect(desktopOnlyIds.length).toBeGreaterThan(0);

    for (const desktopId of desktopOnlyIds) {
      expect(isRecommendedModel(desktopId)).toBe(false);
      expect(getModelById(desktopId)).toBeUndefined();
    }
  });

  it("should find valid models with getModelById", () => {
    const firstModel = RECOMMENDED_MODELS[0];
    const found = getModelById(firstModel.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(firstModel.id);
    expect(isRecommendedModel(firstModel.id)).toBe(true);
  });

  it("exposes the researched mobile catalog in recommendation order", () => {
    expect(RECOMMENDED_MODELS.map((model) => model.id)).toEqual([
      "lfm2.5-2.6b-q4",
      "qwen3.5-2b-q4",
      "kanana-2-3b-instruct-q4",
      "qwen3-edgerazor-1.7b-tq1",
      "minicpm5-1b-q4",
      "qwen3-edgerazor-0.6b-tq1",
      "g9v3-3b-q4",
      "nanbeige4.2-3b-q4",
      "kanana-2-1.3b-instruct-q8",
      "lfm2.5-350m-q4",
      "qwen3.5-0.8b-q4",
      "lfm2.5-1.2b-instruct-q4",
      "qwen3.5-4b-q4",
      "ministral-3-3b-instruct-q4",
      "ministral-3-3b-reasoning-q4",
      "granite-4.0-micro-q4",
      "smallthinker-4b-a0.6b-q4",
      "exaone-4.0-1.2b-q4",
      "hyperclovax-seed-1.5b-q4",
      "smollm3-3b-q4",
      "gemma-3n-e2b-it-q4",
      "lfm2.5-8b-a1b-q4",
      "qwen3.5-9b-q4",
      "ministral-3-8b-instruct-q4",
    ]);

    expect(
      RECOMMENDED_MODELS.filter((model) => model.mobileProfile.recommended),
    ).toHaveLength(1);
    expect(RECOMMENDED_MODELS.every((model) => (model.sizeBytes ?? 0) > 0)).toBe(true);
    expect(RECOMMENDED_MODELS.every((model) => model.license)).toBe(true);
    expect(RECOMMENDED_MODELS.every((model) => model.releasedAt)).toBe(true);
    expect(RECOMMENDED_MODELS.every((model) => model.ggufSource)).toBe(true);
    expect(
      RECOMMENDED_MODELS.every((model) => model.filename.endsWith(".gguf")),
    ).toBe(true);
    expect(
      RECOMMENDED_MODELS.some(
        (model) => (model.sizeBytes ?? 0) > 3_000_000_000,
      ),
    ).toBe(true);
    expect(
      RECOMMENDED_MODELS.filter((model) =>
        model.releasedAt?.startsWith("2026"),
      ),
    ).toHaveLength(15);
    expect(
      RECOMMENDED_MODELS.filter((model) => model.mobileProfile.lowBit),
    ).toHaveLength(2);
    expect(
      RECOMMENDED_MODELS.some((model) => model.ggufSource === "publisher"),
    ).toBe(true);
    expect(
      RECOMMENDED_MODELS.some((model) => model.ggufSource === "community"),
    ).toBe(true);
  });
});
