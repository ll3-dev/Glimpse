import type { MobileModelTier } from "@glimpse/shared";
import type { ModelInfo } from "@/src/features/ai/model-manager";
import type { LocalModel } from "@/src/stores/settings/local-llm.store";
import {
  isModelVisibleForDevice,
  type MobileDeviceProfile,
} from "@/src/features/ai/model-manager/device-compatibility";

export type ModelCatalogFilter =
  | "device"
  | "all"
  | "latest"
  | "korean"
  | "lowbit"
  | "publisher";

export const MODEL_GROUPS: {
  tier: MobileModelTier;
  title: string;
  description: string;
}[] = [
  {
    tier: "compact",
    title: "가볍고 빠르게",
    description: "저장 공간과 배터리 사용을 줄이고 싶을 때",
  },
  {
    tier: "balanced",
    title: "균형 있게",
    description: "일상 대화와 문서 작업에 가장 무난한 선택",
  },
  {
    tier: "quality",
    title: "품질을 우선해서",
    description: "용량보다 답변 완성도를 더 중시할 때",
  },
];

export function getDownloadStatus(
  modelId: string,
  downloadingModelId: string | null,
  models: LocalModel[],
): "idle" | "downloading" | "completed" | "error" {
  if (downloadingModelId === modelId) {
    return "downloading";
  }

  const model = models.find((item) => item.id === modelId);
  if (model?.downloadError) {
    return "error";
  }
  if (model?.isReady) {
    return "completed";
  }
  return "idle";
}

function matchesCatalogFilter(
  model: ModelInfo,
  filter: ModelCatalogFilter,
  device: MobileDeviceProfile,
): boolean {
  switch (filter) {
    case "device":
      return isModelVisibleForDevice(model, device);
    case "latest":
      return model.releasedAt?.startsWith("2026") ?? false;
    case "korean":
      return model.mobileProfile.strengths.some((strength) =>
        strength.includes("한국어"),
      );
    case "publisher":
      return model.ggufSource === "publisher";
    case "lowbit":
      return model.mobileProfile.lowBit ?? false;
    case "all":
      return true;
  }
}

export function filterCatalogModels(
  models: ModelInfo[],
  filter: ModelCatalogFilter,
  query: string,
  device: MobileDeviceProfile,
): ModelInfo[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");

  return models.filter((model) => {
    if (!matchesCatalogFilter(model, filter, device)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchableText = [
      model.name,
      model.description,
      model.repo,
      model.quantization,
      ...model.mobileProfile.strengths,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("ko-KR");

    return searchableText.includes(normalizedQuery);
  });
}

export function getCatalogFilterCounts(
  models: ModelInfo[],
  device: MobileDeviceProfile,
): Record<ModelCatalogFilter, number> {
  return {
    device: models.filter((model) =>
      matchesCatalogFilter(model, "device", device),
    ).length,
    all: models.length,
    latest: models.filter((model) =>
      matchesCatalogFilter(model, "latest", device),
    ).length,
    korean: models.filter((model) =>
      matchesCatalogFilter(model, "korean", device),
    ).length,
    lowbit: models.filter((model) =>
      matchesCatalogFilter(model, "lowbit", device),
    ).length,
    publisher: models.filter((model) =>
      matchesCatalogFilter(model, "publisher", device),
    ).length,
  };
}
