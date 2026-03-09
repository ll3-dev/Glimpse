/**
 * Local LLM Section Component
 *
 * Displays Local LLM settings including model download and selection.
 */

import { Activity, useCallback, useEffect, useRef } from 'react';
import { Alert, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Bot, Loader } from 'lucide-react-native';
import { Switch } from '@/src/ui/primitives';
import { SettingsSection } from './SettingsSection';
import { canToggleLocalLLM, getLocalLLMToggleDisabledReason } from './localLLMToggle';
import { ModelDownloadCard } from './ModelDownloadCard';
import {
  RECOMMENDED_MODELS,
  type ModelInfo,
  ModelDownloader,
} from '@/src/features/ai/model-manager';
import {
  useLocalLLMStoreConfig,
  startLocalLLMDownload,
  updateLocalLLMDownloadProgress,
  finishLocalLLMDownload,
  failLocalLLMDownload,
  addLocalLLMModel,
  removeLocalLLMModel,
  type LocalModel,
} from '@/src/stores/settings/local-llm.store';

type LocalLLMSectionProps = {
  enabled: boolean;
  ready: boolean;
  models: LocalModel[];
  selectedModelId: string | null;
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
  models,
  selectedModelId,
  onToggle,
  onSelectModel,
}: LocalLLMSectionProps) {
  // Get download and loading state from store
  const downloadingModelId = useLocalLLMStoreConfig((c) => c.downloadingModelId);
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

    const initializeModels = async () => {
      for (const model of RECOMMENDED_MODELS) {
        const exists = availableModels.some((m) => m.id === model.id);
        if (!exists) {
          // Check if model is already downloaded
          const isDownloaded = await ModelDownloader.isModelDownloaded(model.filename);
          const localModel: LocalModel = {
            id: model.id,
            name: model.name,
            repo: model.repo,
            filename: model.filename,
            size: isDownloaded ? await ModelDownloader.getModelSize(model.filename) ?? undefined : undefined,
            isReady: isDownloaded,
            path: isDownloaded ? ModelDownloader.getModelPath(model.filename) : undefined,
          };
          addLocalLLMModel(localModel);
        } else {
          // Update existing model's ready status based on file existence
          const existingModel = availableModels.find((m) => m.id === model.id);
          if (existingModel && !existingModel.isReady) {
            const isDownloaded = await ModelDownloader.isModelDownloaded(model.filename);
            if (isDownloaded) {
              const path = ModelDownloader.getModelPath(model.filename);
              const size = await ModelDownloader.getModelSize(model.filename) ?? undefined;
              addLocalLLMModel({ ...existingModel, isReady: true, path, size });
            }
          }
        }
      }
    };

    initializeModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle model download
  const handleDownload = useCallback(async (model: ModelInfo) => {
    startLocalLLMDownload(model.id);

    const downloader = new ModelDownloader();
    try {
      const path = await downloader.downloadModel(model, (progress) => {
        updateLocalLLMDownloadProgress(progress.percentage);
      });
      finishLocalLLMDownload(model.id, path);

      // Update model size
      const size = await ModelDownloader.getModelSize(model.filename);
      if (size) {
        const storeModel = availableModels.find((m) => m.id === model.id);
        if (storeModel) {
          addLocalLLMModel({ ...storeModel, size });
        }
      }
    } catch (error) {
      failLocalLLMDownload(error instanceof Error ? error.message : '다운로드 실패');
    }
  }, [availableModels]);

  // Handle model deletion
  const handleDelete = useCallback(async (model: ModelInfo) => {
    try {
      await ModelDownloader.deleteModel(model.filename);
      removeLocalLLMModel(model.id);

      // If this was the selected model, clear selection via parent
      if (selectedModelId === model.id) {
        onSelectModel(''); // Clear selection via parent callback
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  }, [selectedModelId, onSelectModel]);

  // Handle model selection - also enable Local LLM automatically
  const handleSelect = useCallback(async (modelId: string) => {
    const model = availableModels.find((m) => m.id === modelId);
    if (!model?.isReady) return;

    onSelectModel(modelId);

    // Auto-enable Local LLM when selecting a model
    if (!enabled) {
      onToggle(true);
    }
  }, [availableModels, onSelectModel, enabled, onToggle]);

  // Handle toggle - just call parent callback
  const handleToggle = useCallback((value: boolean) => {
    onToggle(value);
  }, [onToggle]);

  // Show details when enabled or any activity (downloading/loading)
  const canToggle = canToggleLocalLLM(enabled, selectedModelId, availableModels);
  const disabledReason = getLocalLLMToggleDisabledReason(enabled, selectedModelId, availableModels);

  const handleTogglePress = useCallback(() => {
    if (!canToggle) {
      Alert.alert('로컬 LLM 사용 불가', disabledReason || '현재는 로컬 LLM을 켤 수 없습니다.');
      return;
    }

    if (isLoading) {
      Alert.alert('모델 로딩 중', '모델 로딩이 끝난 뒤 다시 시도해주세요.');
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
            <Text className="text-base font-semibold text-app-text">로컬 모델 사용</Text>
            {isLoading && <Loader size={14} className="text-app-muted animate-spin" />}
          </View>
          <Text className="text-xs text-app-muted mt-0.5">
            기기에서 직접 실행되는 AI 모델
          </Text>
        </View>
        <TouchableOpacity onPress={handleTogglePress} activeOpacity={0.8}>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={!canToggle || isLoading}
          />
        </TouchableOpacity>
      </View>

      <Activity mode="visible">
        <View className="mt-4">
          {/* Loading progress */}
          {isLoading && (
            <View className="mb-4 p-3 bg-app-bg rounded-lg">
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#37352f" />
                <Text className="text-sm text-app-text">모델 로딩 중... {loadProgress}%</Text>
              </View>
            </View>
          )}

          {/* Load error */}
          {loadError && (
            <View className="mb-4 p-3 bg-app-bg rounded-lg">
              <Text className="text-sm text-app-accent">{loadError}</Text>
            </View>
          )}

          {/* Download error */}
          {downloadError && (
            <View className="mb-4 p-3 bg-app-bg rounded-lg">
              <Text className="text-sm text-app-accent">{downloadError}</Text>
            </View>
          )}

          {/* Model list */}
          <View>
            <Text className="text-xs font-bold text-app-muted mb-2 uppercase tracking-tight">
              모델 다운로드
            </Text>
            <View className="gap-2">
              {RECOMMENDED_MODELS.map((model) => {
                const status = getDownloadStatus(model.id, downloadingModelId, availableModels);
                const localModel = availableModels.find((m) => m.id === model.id);

                return (
                  <ModelDownloadCard
                    key={model.id}
                    model={model}
                    status={status}
                    isSelected={selectedModelId === model.id}
                    downloadProgress={
                      status === "downloading"
                        ? { written: 0, total: 0, percentage: downloadProgress }
                        : undefined
                    }
                    errorMessage={
                      status === "idle"
                        ? (downloadError ?? undefined)
                        : undefined
                    }
                    onDownload={() => handleDownload(model)}
                    onDelete={() => handleDelete(model)}
                    onSelect={() => handleSelect(model.id)}
                    canSelect={localModel?.isReady ?? false}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </Activity>
    </SettingsSection>
  );
}
