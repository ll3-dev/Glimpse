/**
 * Local LLM Section Component
 *
 * Displays Local LLM settings including model download and selection.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Alert, View, Text, ActivityIndicator } from 'react-native';
import { Bot, Loader } from 'lucide-react-native';
import { Switch } from '@glimpse/ui/primitives';
import { SettingsSection } from './SettingsSection';
import {
  canToggleLocalLLM,
  getLocalLLMToggleDisabledReason,
  cancelLocalModelDownload,
  downloadLocalModel,
  syncRecommendedLocalModels,
} from '@/src/features/settings';
import { ModelDownloadCard } from './ModelDownloadCard';
import {
  RECOMMENDED_MODELS,
  type ModelInfo,
  ModelDownloader,
} from '@/src/features/ai/model-manager';
import {
  useLocalLLMStoreConfig,
  removeLocalLLMModel,
  type LocalModel,
} from "@/src/stores/settings/local-llm.store";

type LocalLLMSectionProps = {
  enabled: boolean;
  ready: boolean;
  models: LocalModel[];
  selectedModelId: string | null;
  sourceRoute?: string | null;
  onToggle: (value: boolean) => void;
  onSelectModel: (modelId: string) => void;
};

/**
 * Get download status for a model
 */
function getDownloadStatus(
  modelId: string,
  downloadingModelId: string | null,
  availableModels: LocalModel[]
): 'idle' | 'downloading' | 'completed' | 'error' {
  if (downloadingModelId === modelId) {
    return 'downloading';
  }
  const localModel = availableModels.find((m) => m.id === modelId);
  if (localModel?.isReady) {
    return 'completed';
  }
  return 'idle';
}

export function LocalLLMSection({
  enabled,
  ready: _ready,
  models: _models,
  selectedModelId,
  sourceRoute,
  onToggle,
  onSelectModel,
}: LocalLLMSectionProps) {
  // Get download and loading state from store
  const downloadingModelId = useLocalLLMStoreConfig(
    (c) => c.downloadingModelId,
  );
  const downloadProgress = useLocalLLMStoreConfig((c) => c.downloadProgress);
  const downloadError = useLocalLLMStoreConfig((c) => c.downloadError);
  const isLoading = useLocalLLMStoreConfig((c) => c.isLoading);
  const loadProgress = useLocalLLMStoreConfig((c) => c.loadProgress);
  const loadError = useLocalLLMStoreConfig((c) => c.loadError);
  const availableModels = useLocalLLMStoreConfig((c) => c.availableModels);

  // Track initialization to prevent duplicate runs
  const initializedRef = useRef(false);

  // Initialize recommended models in the store if not already present
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    void syncRecommendedLocalModels();
  }, []);

  // Handle model download
  const handleDownload = useCallback(
    async (model: ModelInfo) => {
      const result = await downloadLocalModel(model, { sourceRoute });
      if (!result.success && 'error' in result) {
        Alert.alert("다운로드 실패", result.error);
      }
    },
    [sourceRoute],
  );

  const handleCancelDownload = useCallback(async () => {
    await cancelLocalModelDownload();
  }, []);

  // Handle model deletion
  const handleDelete = useCallback(
    async (model: ModelInfo) => {
      try {
        await ModelDownloader.deleteModel(model.filename);
        removeLocalLLMModel(model.id);

        // If this was the selected model, clear selection via parent
        if (selectedModelId === model.id) {
          onSelectModel(""); // Clear selection via parent callback
        }
      } catch (error) {
        console.error("Failed to delete model:", error);
      }
    },
    [selectedModelId, onSelectModel],
  );

  // Handle model selection - also enable Local LLM automatically
  const handleSelect = useCallback(
    async (modelId: string) => {
      const model = availableModels.find((m) => m.id === modelId);
      if (!model?.isReady) return;

      onSelectModel(modelId);

      // Auto-enable Local LLM when selecting a model
      if (!enabled) {
        onToggle(true);
      }
    },
    [availableModels, onSelectModel, enabled, onToggle],
  );

  // Show details when enabled or any activity (downloading/loading)
  const canToggle = canToggleLocalLLM(
    enabled,
    selectedModelId,
    availableModels,
  );
  const disabledReason = getLocalLLMToggleDisabledReason(
    enabled,
    selectedModelId,
    availableModels,
  );

  const handleTogglePress = useCallback(() => {
    if (!canToggle) {
      Alert.alert(
        "로컬 LLM 사용 불가",
        disabledReason || "현재는 로컬 LLM을 켤 수 없습니다.",
      );
      return;
    }

    if (isLoading) {
      Alert.alert("모델 로딩 중", "모델 로딩이 끝난 뒤 다시 시도해주세요.");
      return;
    }

    onToggle(!enabled);
  }, [canToggle, disabledReason, isLoading, onToggle, enabled]);

  return (
    <SettingsSection
      title="로컬 LLM"
      icon={<Bot size={18} color="#787774" />}
      footer="ⓘ Apple Silicon Mac 또는 iOS 18+에서 사용할 수 있습니다"
    >
      {/* Enable/Disable toggle */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-app-text text-base font-semibold">
              로컬 모델 사용
            </Text>
            {isLoading && (
              <Loader size={14} className="text-app-muted animate-spin" />
            )}
          </View>
          <Text className="text-app-muted mt-0.5 text-xs">
            기기에서 직접 실행되는 AI 모델
          </Text>
        </View>
        <Switch
          checked={enabled}
          onCheckedChange={handleTogglePress}
          disabled={!canToggle || isLoading}
        />
      </View>

      {/* Show details only when enabled */}
      {enabled && (
        <View className="mt-4">
          {/* Loading progress */}
          {isLoading && (
            <View className="bg-app-bg mb-4 rounded-lg p-3">
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#37352f" />
                <Text className="text-app-text text-sm">
                  모델 로딩 중... {loadProgress}%
                </Text>
              </View>
            </View>
          )}

          {/* Load error */}
          {loadError && (
            <View className="bg-app-bg mb-4 rounded-lg p-3">
              <Text className="text-app-accent text-sm">{loadError}</Text>
            </View>
          )}

          {/* Download error */}
          {downloadError && (
            <View className="bg-app-bg mb-4 rounded-lg p-3">
              <Text className="text-app-accent text-sm">{downloadError}</Text>
            </View>
          )}

          {/* Model list */}
          <View>
            <Text className="text-app-muted mb-2 text-xs font-bold tracking-tight uppercase">
              모델 다운로드
            </Text>
            <View className="gap-2">
              {RECOMMENDED_MODELS.map((model) => {
                const status = getDownloadStatus(
                  model.id,
                  downloadingModelId,
                  availableModels,
                );
                const localModel = availableModels.find((m) => m.id === model.id);

                return (
                  <ModelDownloadCard
                    key={model.id}
                    model={model}
                    status={status}
                    isSelected={selectedModelId === model.id}
                    downloadProgress={
                      status === "downloading"
                        ? (downloadProgress ?? undefined)
                        : undefined
                    }
                  errorMessage={
                    status === "idle" ? (downloadError ?? undefined) : undefined
                  }
                  onDownload={() => handleDownload(model)}
                  onCancelDownload={
                    status === 'downloading' ? handleCancelDownload : undefined
                  }
                  onDelete={() => handleDelete(model)}
                  onSelect={() => handleSelect(model.id)}
                  canSelect={localModel?.isReady ?? false}
                  />
                );
              })}
            </View>
          </View>
        </View>
      )}
    </SettingsSection>
  );
}
