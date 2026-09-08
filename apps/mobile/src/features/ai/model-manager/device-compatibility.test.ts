import { describe, test, expect } from "bun:test";
import type { ModelInfo } from "./model-list";
import {
  blockedModelWarning,
  getModelCompatibility,
  inferMinimumRamGb,
  isModelVisibleForDevice,
  totalMemoryBytesToRamGb,
  type MobileDeviceProfile,
} from "./device-compatibility";

function makeModel(sizeBytes: number, minRamGb?: number): ModelInfo {
  return {
    id: `model-${sizeBytes}`,
    name: "Test model",
    repo: "test/model",
    filename: "model.gguf",
    family: "embedded-chat",
    sizeBytes,
    quantization: "Q4_K_M",
    contextLength: 4096,
    mobileProfile: {
      rank: 1,
      tier: "compact",
      strengths: [],
      minRamGb,
    },
  };
}

const ios8Gb: MobileDeviceProfile = {
  platform: "ios",
  modelName: "iPhone",
  ramGb: 8,
};

describe("mobile model device compatibility", () => {
  test("normalizes kernel-visible memory to marketed RAM buckets", () => {
    expect(totalMemoryBytesToRamGb(5.65 * 1024 ** 3)).toBe(6);
    expect(totalMemoryBytesToRamGb(null)).toBeNull();
  });

  test("infers conservative RAM requirements from GGUF size", () => {
    expect(inferMinimumRamGb(makeModel(500_000_000))).toBe(3);
    expect(inferMinimumRamGb(makeModel(2_000_000_000))).toBe(6);
    expect(inferMinimumRamGb(makeModel(3_000_000_000))).toBe(8);
    expect(inferMinimumRamGb(makeModel(5_000_000_000))).toBe(12);
  });

  test("honors explicit RAM requirements", () => {
    expect(inferMinimumRamGb(makeModel(400_000_000, 8))).toBe(8);
  });

  test("recommends models with memory headroom", () => {
    expect(getModelCompatibility(makeModel(1_000_000_000), ios8Gb).status).toBe(
      "recommended",
    );
  });

  test("keeps boundary models visible with a caution", () => {
    const compatibility = getModelCompatibility(
      makeModel(3_000_000_000),
      ios8Gb,
    );
    expect(compatibility.status).toBe("caution");
    expect(isModelVisibleForDevice(makeModel(3_000_000_000), ios8Gb)).toBe(
      true,
    );
  });

  test("blocks models above the device memory class", () => {
    const model = makeModel(5_000_000_000);
    expect(getModelCompatibility(model, ios8Gb).status).toBe("blocked");
    expect(isModelVisibleForDevice(model, ios8Gb)).toBe(false);
  });

  test("leaves models visible when RAM cannot be read", () => {
    const device: MobileDeviceProfile = {
      platform: "android",
      modelName: null,
      ramGb: null,
    };
    expect(getModelCompatibility(makeModel(5_000_000_000), device).status).toBe(
      "unknown",
    );
  });
});

describe("blockedModelWarning", () => {
  const model = { name: "Qwen 3.5 9B" };

  test("기기 RAM이 확인될 때 권장 RAM과 기기 RAM을 모두 안내한다", () => {
    const device: MobileDeviceProfile = { platform: "ios", modelName: "iPhone", ramGb: 6 };
    const compatibility = getModelCompatibility(makeModel(4_500_000_000), device);
    expect(compatibility.status).toBe("blocked");

    const warning = blockedModelWarning(model, device, compatibility);
    expect(warning.title).toBe("RAM 부족 경고");
    expect(warning.message).toContain("12GB");
    expect(warning.message).toContain("6GB");
    expect(warning.message).toContain("그래도 진행할까요?");
  });

  test("기기 RAM을 모를 때는 기기 문구를 일반화한다", () => {
    const device: MobileDeviceProfile = { platform: "ios", modelName: null, ramGb: null };
    const compatibility = getModelCompatibility(makeModel(4_500_000_000), device);
    const warning = blockedModelWarning(model, device, compatibility);
    expect(warning.message).toContain("이 기기");
  });
});
