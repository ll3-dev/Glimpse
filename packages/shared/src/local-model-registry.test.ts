import { describe, expect, it } from "bun:test";
import { LOCAL_MODEL_REGISTRY } from "./local-model-registry";

describe("LOCAL_MODEL_REGISTRY licenseKind", () => {
  it("모든 엔트리에 license와 licenseKind가 있다", () => {
    for (const m of LOCAL_MODEL_REGISTRY) {
      expect(m.license).toBeDefined();
      expect(m.licenseKind).toBeDefined();
    }
  });

  it("custom 라이선스 모델 집합은 기대 목록과 정확히 일치한다", () => {
    const expected = [
      "lfm2.5-2.6b-q4",
      "lfm2.5-350m-q4",
      "lfm2.5-1.2b-instruct-q4",
      "lfm2.5-8b-a1b-q4",
      "kanana-2-3b-instruct-q4",
      "kanana-2-1.3b-instruct-q8",
      "exaone-4.0-1.2b-q4",
      "hyperclovax-seed-1.5b-q4",
      "gemma-3n-e2b-it-q4",
    ];
    const actual = LOCAL_MODEL_REGISTRY
      .filter((m) => m.licenseKind === "custom")
      .map((m) => m.id)
      .sort();
    expect(actual).toEqual([...expected].sort());
  });

  it("추천(recommended) 모델은 permissive 라이선스다", () => {
    const recommended = LOCAL_MODEL_REGISTRY.filter(
      (m) => m.mobileProfile?.recommended,
    );
    expect(recommended.length).toBeGreaterThan(0);
    for (const m of recommended) {
      expect(m.licenseKind).toBe("permissive");
    }
  });
});
