/**
 * useChatAISetup Hook
 *
 * Manages AI model selection and setup state for chat.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  enableLocalLLM,
  isLocalLLMReady,
  selectLocalLLMModel,
  syncRecommendedLocalModels,
  useAvailableLocalModels,
  useSelectedLocalModelId,
} from '@/src/features/settings';
import { resolveEffectiveTarget } from '@/src/features/ai/targets';
import { useLocalLLMStoreConfig } from '@/src/stores/settings/local-llm.store';

interface UseChatAISetupOptions {
  conversationId: string;
  onNavigateBack: () => void;
  onNavigateToSettings: () => void;
}

interface UseChatAISetupReturn {
  showDialog: boolean;
  isChecking: boolean;
  selectedModelId: string | null;
  models: ReturnType<typeof useAvailableLocalModels>;
  isDownloading: boolean;
  downloadProgress: number | null;
  handleSelectModel: (modelId: string) => void;
  handleOpenSettings: () => void;
  handleBack: () => void;
  ensureReady: () => Promise<boolean>;
}

export function useChatAISetup({
  conversationId,
  onNavigateBack,
  onNavigateToSettings,
}: UseChatAISetupOptions): UseChatAISetupReturn {
  const [showDialog, setShowDialog] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const selectedModelId = useSelectedLocalModelId();
  const models = useAvailableLocalModels();
  const downloadStatus = useLocalLLMStoreConfig((config) => config.downloadStatus);
  const downloadProgress = useLocalLLMStoreConfig((config) => config.downloadProgress);

  const ensureReady = useCallback(async () => {
    // If chat target is remote BYOK or Apple Intelligence, local LLM model setup is not required
    const target = resolveEffectiveTarget('chat');
    if (target.kind !== 'local') {
      setShowDialog(false);
      return true;
    }

    if (isLocalLLMReady()) {
      setShowDialog(false);
      return true;
    }

    const syncedModels = await syncRecommendedLocalModels();
    const selectedModel = selectedModelId
      ? syncedModels.find((model) => model.id === selectedModelId && model.isReady)
      : null;

    if (selectedModel) {
      const result = enableLocalLLM();
      if (result.success) {
        setShowDialog(false);
        return true;
      }
    }

    const readyModels = syncedModels.filter((model) => model.isReady);
    if (readyModels.length === 1) {
      selectLocalLLMModel(readyModels[0].id);
      const result = enableLocalLLM();
      if (result.success) {
        setShowDialog(false);
        return true;
      }
    }

    setShowDialog(true);
    return false;
  }, [selectedModelId]);

  // Initialize on mount
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      setIsChecking(true);
      try {
        const ready = await ensureReady();
        if (!cancelled) {
          setShowDialog(!ready);
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [ensureReady]);

  const handleSelectModel = (modelId: string) => {
    selectLocalLLMModel(modelId);
    const result = enableLocalLLM();
    if (result.success) {
      setShowDialog(false);
    }
  };

  const handleOpenSettings = () => {
    setShowDialog(false);
    onNavigateToSettings();
  };

  const handleBack = () => {
    onNavigateBack();
  };

  return {
    showDialog,
    isChecking,
    selectedModelId,
    models,
    isDownloading: downloadStatus === 'downloading',
    downloadProgress: downloadProgress?.percentage ?? null,
    handleSelectModel,
    handleOpenSettings,
    handleBack,
    ensureReady,
  };
}
