import { describe, expect, test } from "bun:test";
import { RECOMMENDED_MODELS } from "@/src/features/ai/model-manager";
import {
  filterCatalogModels,
  getCatalogFilterCounts,
} from "./local-model-catalog";
import type { MobileDeviceProfile } from "@/src/features/ai/model-manager/device-compatibility";

const ios6Gb: MobileDeviceProfile = {
  platform: "ios",
  modelName: "iPhone",
  ramGb: 6,
};

describe("local model catalog filters", () => {
  test("counts latest, Korean, and publisher GGUF models independently", () => {
    const counts = getCatalogFilterCounts(RECOMMENDED_MODELS, ios6Gb);

    expect(counts.all).toBe(24);
    expect(counts.device).toBe(17);
    expect(counts.latest).toBe(15);
    expect(counts.lowbit).toBe(2);
    expect(counts.korean).toBeGreaterThan(0);
    expect(counts.publisher).toBeGreaterThan(0);
  });

  test("searches within the selected catalog filter", () => {
    expect(
      filterCatalogModels(RECOMMENDED_MODELS, "latest", "kanana", ios6Gb).map(
        (model) => model.id,
      ),
    ).toEqual(["kanana-2-3b-instruct-q4", "kanana-2-1.3b-instruct-q8"]);

    expect(
      filterCatalogModels(RECOMMENDED_MODELS, "publisher", "커뮤니티", ios6Gb),
    ).toHaveLength(0);
  });

  test("cuts large models only in the device filter", () => {
    expect(
      filterCatalogModels(RECOMMENDED_MODELS, "device", "Qwen 3.5 9B", ios6Gb),
    ).toHaveLength(0);
    expect(
      filterCatalogModels(RECOMMENDED_MODELS, "all", "Qwen 3.5 9B", ios6Gb),
    ).toHaveLength(1);
  });
});
