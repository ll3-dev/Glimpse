import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  cancelLocalModelDownload,
  downloadLocalModel,
  syncRecommendedLocalModels,
} from '@/src/features/settings';
import {
  ModelDownloader,
  type ModelInfo,
} from '@/src/features/ai/model-manager';
import {
  removeLocalLLMModel,
  useLocalLLMStoreConfig,
  type LocalModel,
} from '@/src/stores/settings/local-llm.store';

type LocalModelCatalogActionsInput = {
  enabled: boolean;
  models: LocalModel[];
  selectedModelId: string | null;
  onToggle: (value: boolean) => void;
  onSelectModel: (modelId: string) => void;
};

export function useLocalModelCatalogActions({
  enabled,
  models,
  selectedModelId,
  onToggle,
  onSelectModel,
}: LocalModelCatalogActionsInput) {
  const downloadingModelId = useLocalLLMStoreConfig(
    (config) => config.downloadingModelId,
  );
  const downloadProgress = useLocalLLMStoreConfig(
    (config) => config.downloadProgress,
  );
  const downloadError = useLocalLLMStoreConfig((config) => config.downloadError);

  useEffect(() => {
    void syncRecommendedLocalModels();
  }, []);

  const downloadModel = useCallback(async (model: ModelInfo) => {
    const result = await downloadLocalModel(model, { sourceRoute: '/local-models' });
    if (!result.success && 'error' in result) {
      Alert.alert('다운로드 실패', result.error);
    }
  }, []);

  const cancelDownload = useCallback(async () => {
    await cancelLocalModelDownload();
  }, []);

  const deleteModelFile = useCallback(
    async (model: ModelInfo) => {
      try {
        await ModelDownloader.deleteModel(model.filename);
        removeLocalLLMModel(model.id);
        if (selectedModelId === model.id) {
          onSelectModel('');
          if (enabled) {
            onToggle(false);
          }
        }
        await syncRecommendedLocalModels();
      } catch (error) {
        const message = error instanceof Error ? error.message : '모델을 삭제하지 못했습니다.';
        Alert.alert('삭제 실패', message);
      }
    },
    [enabled, onSelectModel, onToggle, selectedModelId],
  );

  const confirmDelete = useCallback(
    (model: ModelInfo) => {
      Alert.alert(
        '다운로드한 모델 삭제',
        `${model.name} 파일을 이 기기에서 삭제할까요?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => void deleteModelFile(model),
          },
        ],
      );
    },
    [deleteModelFile],
  );

  const selectModel = useCallback(
    (modelId: string) => {
      const model = models.find((item) => item.id === modelId);
      if (!model?.isReady) {
        return;
      }

      onSelectModel(modelId);
      if (!enabled) {
        onToggle(true);
      }
    },
    [enabled, models, onSelectModel, onToggle],
  );

  return {
    downloadingModelId,
    downloadProgress,
    downloadError,
    downloadModel,
    cancelDownload,
    confirmDelete,
    selectModel,
  };
}
