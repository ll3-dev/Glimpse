import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { RECOMMENDED_MODELS } from "@/src/features/ai/model-manager";
import type { LocalModel } from "@/src/stores/settings/local-llm.store";
import { useLocalModelCatalogActions } from "@/src/hooks/useLocalModelCatalog";
import { getCurrentDeviceProfile } from "@/src/features/ai/model-manager/current-device-profile";
import { getModelCompatibility } from "@/src/features/ai/model-manager/device-compatibility";
import { ModelDownloadCard } from "./ModelDownloadCard";
import { ModelCatalogFilters } from "./ModelCatalogFilters";
import { DeviceCompatibilitySummary } from "./DeviceCompatibilitySummary";
import {
  filterCatalogModels,
  getCatalogFilterCounts,
  getDownloadStatus,
  MODEL_GROUPS,
  type ModelCatalogFilter,
} from "./local-model-catalog";
import { blockedModelWarning } from "@/src/features/ai/model-manager/device-compatibility";

type LocalModelCatalogProps = {
  enabled: boolean;
  models: LocalModel[];
  selectedModelId: string | null;
  onToggle: (value: boolean) => void;
  onSelectModel: (modelId: string) => void;
};

export function LocalModelCatalog({
  enabled,
  models,
  selectedModelId,
  onToggle,
  onSelectModel,
}: LocalModelCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<ModelCatalogFilter>("device");
  const deviceProfile = useMemo(() => getCurrentDeviceProfile(), []);
  const {
    downloadingModelId,
    downloadProgress,
    downloadError,
    downloadModel,
    cancelDownload,
    confirmDelete,
    selectModel,
  } = useLocalModelCatalogActions({
    enabled,
    models,
    selectedModelId,
    onToggle,
    onSelectModel,
  });

  const filterCounts = useMemo(
    () => getCatalogFilterCounts(RECOMMENDED_MODELS, deviceProfile),
    [deviceProfile],
  );
  const visibleModels = useMemo(
    () =>
      filterCatalogModels(
        RECOMMENDED_MODELS,
        activeFilter,
        query,
        deviceProfile,
      ),
    [activeFilter, deviceProfile, query],
  );

  return (
    <View className="gap-7">
      <DeviceCompatibilitySummary
        device={deviceProfile}
        compatibleCount={filterCounts.device}
        totalCount={filterCounts.all}
      />

      <ModelCatalogFilters
        query={query}
        activeFilter={activeFilter}
        counts={filterCounts}
        onChangeQuery={setQuery}
        onChangeFilter={setActiveFilter}
      />

      {downloadError && (
        <Text className="bg-app-bg border border-app-border text-app-accent rounded-lg p-3 text-xs">
          {downloadError}
        </Text>
      )}

      {MODEL_GROUPS.map((group) => {
        const groupModels = visibleModels.filter(
          (model) => model.mobileProfile.tier === group.tier,
        );

        if (groupModels.length === 0) {
          return null;
        }

        return (
          <View key={group.tier}>
            <Text className="text-app-text text-sm font-bold tracking-tight">
              {group.title}
            </Text>
            <Text className="text-app-muted mt-0.5 mb-3 text-xs">
              {group.description}
            </Text>
            <View className="gap-3">
              {groupModels.map((model) => {
                const compatibility = getModelCompatibility(
                  model,
                  deviceProfile,
                );
                const status = getDownloadStatus(
                  model.id,
                  downloadingModelId,
                  models,
                );
                const localModel = models.find((item) => item.id === model.id);
                const isBlocked = compatibility.status === "blocked";

                // 전문가 경로 — RAM 미달도 경고 확인 후 다운로드·선택 허용.
                const handleDownload = () => {
                  if (isBlocked) {
                    const warning = blockedModelWarning(
                      model,
                      deviceProfile,
                      compatibility,
                    );
                    Alert.alert(warning.title, warning.message, [
                      { text: "취소", style: "cancel" },
                      {
                        text: "그래도 받기",
                        style: "destructive",
                        onPress: () => void downloadModel(model),
                      },
                    ]);
                    return;
                  }
                  void downloadModel(model);
                };
                const handleSelect = () => {
                  if (isBlocked) {
                    const warning = blockedModelWarning(
                      model,
                      deviceProfile,
                      compatibility,
                    );
                    Alert.alert(warning.title, warning.message, [
                      { text: "취소", style: "cancel" },
                      {
                        text: "그래도 사용",
                        style: "destructive",
                        onPress: () => selectModel(model.id),
                      },
                    ]);
                    return;
                  }
                  selectModel(model.id);
                };

                return (
                  <ModelDownloadCard
                    key={model.id}
                    model={model}
                    compatibility={compatibility}
                    status={status}
                    isSelected={selectedModelId === model.id}
                    downloadProgress={
                      status === "downloading" && downloadProgress
                        ? {
                            written: downloadProgress.bytesReceived,
                            total: downloadProgress.totalBytes,
                            percentage: downloadProgress.percentage,
                          }
                        : undefined
                    }
                    errorMessage={localModel?.downloadError ?? undefined}
                    onDownload={handleDownload}
                    onCancelDownload={
                      status === "downloading"
                        ? () => void cancelDownload()
                        : undefined
                    }
                    onDelete={() => confirmDelete(model)}
                    onSelect={handleSelect}
                    canDownload={compatibility.status !== "blocked"}
                    canSelect={
                      (localModel?.isReady ?? false) &&
                      compatibility.status !== "blocked"
                    }
                    isBlocked={isBlocked}
                  />
                );
              })}
            </View>
          </View>
        );
      })}

      {visibleModels.length === 0 && (
        <View className="border-app-border bg-app-card rounded-xl border p-5">
          <Text className="text-app-muted text-center text-sm">
            조건에 맞는 모델이 없습니다.
          </Text>
        </View>
      )}
    </View>
  );
}
