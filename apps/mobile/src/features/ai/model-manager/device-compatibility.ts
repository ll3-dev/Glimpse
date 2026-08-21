import type { ModelInfo } from "./model-list";

const GIB = 1024 ** 3;

export type MobileDevicePlatform = "ios" | "android" | "other";

export interface MobileDeviceProfile {
  platform: MobileDevicePlatform;
  modelName: string | null;
  ramGb: number | null;
}

export type ModelCompatibilityStatus =
  | "recommended"
  | "caution"
  | "blocked"
  | "unknown";

export interface ModelCompatibility {
  status: ModelCompatibilityStatus;
  minRamGb: number;
  label: string;
  reason: string;
}

export function totalMemoryBytesToRamGb(
  totalMemoryBytes: number | null,
): number | null {
  if (!totalMemoryBytes || totalMemoryBytes <= 0) {
    return null;
  }

  // Expo reports kernel-visible memory, which is slightly lower than marketed RAM.
  return Math.max(1, Math.round(totalMemoryBytes / GIB));
}

export function inferMinimumRamGb(model: ModelInfo): number {
  if (model.mobileProfile.minRamGb) {
    return model.mobileProfile.minRamGb;
  }

  const sizeBytes = model.sizeBytes ?? 0;
  if (sizeBytes <= 750_000_000) return 3;
  if (sizeBytes <= 1_500_000_000) return 4;
  if (sizeBytes <= 2_300_000_000) return 6;
  if (sizeBytes <= 3_300_000_000) return 8;
  if (sizeBytes <= 6_000_000_000) return 12;
  return 16;
}

export function getModelCompatibility(
  model: ModelInfo,
  device: MobileDeviceProfile,
): ModelCompatibility {
  const minRamGb = inferMinimumRamGb(model);
  const runtime = model.mobileProfile.runtime ?? "llama-rn";

  if (runtime !== "llama-rn") {
    return {
      status: "blocked",
      minRamGb,
      label: "별도 런타임 필요",
      reason: `${runtime} 런타임은 아직 이 앱에 연결되지 않았어요.`,
    };
  }

  if (device.platform === "other") {
    return {
      status: "blocked",
      minRamGb,
      label: "모바일 전용",
      reason: "현재 로컬 모델 런타임은 iOS와 Android에서 지원돼요.",
    };
  }

  if (device.ramGb === null) {
    return {
      status: "unknown",
      minRamGb,
      label: `RAM ${minRamGb}GB+`,
      reason: "기기 RAM을 확인할 수 없어 직접 호환성을 확인해야 해요.",
    };
  }

  if (device.ramGb < minRamGb) {
    return {
      status: "blocked",
      minRamGb,
      label: `RAM ${minRamGb}GB+ 필요`,
      reason: `${device.ramGb}GB 기기에서는 메모리 부족으로 중단될 가능성이 높아요.`,
    };
  }

  if (device.ramGb < minRamGb + 2) {
    return {
      status: "caution",
      minRamGb,
      label: "실행 가능 · 주의",
      reason: `최소 ${minRamGb}GB 조건은 맞지만 긴 입력에서는 앱이 종료될 수 있어요.`,
    };
  }

  return {
    status: "recommended",
    minRamGb,
    label: "이 기기에 적합",
    reason: `${device.ramGb}GB RAM 기준으로 권장 범위예요.`,
  };
}

export function isModelVisibleForDevice(
  model: ModelInfo,
  device: MobileDeviceProfile,
): boolean {
  return getModelCompatibility(model, device).status !== "blocked";
}
