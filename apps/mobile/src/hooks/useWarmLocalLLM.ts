import { useEffect, useRef } from 'react';
import {
  syncRecommendedLocalModels,
  useLocalLLMEnabled,
  useSelectedLocalModel,
} from '@/src/features/settings';
import { getLocalLLMRuntime } from '@/src/hooks/chat/chatRuntime';
import { logger } from '@/src/utils/logger';

export function useWarmLocalLLM() {
  const enabled = useLocalLLMEnabled();
  const selectedModel = useSelectedLocalModel();
  const lastAttemptedModelIdRef = useRef<string | null>(null);

  useEffect(() => {
    void syncRecommendedLocalModels().catch((error) => {
      logger.error('Failed to sync local LLM models during warmup', error);
    });
  }, []);

  useEffect(() => {
    if (!enabled || !selectedModel?.isReady || !selectedModel.path) {
      lastAttemptedModelIdRef.current = null;
      return;
    }

    if (lastAttemptedModelIdRef.current === selectedModel.id) {
      return;
    }

    lastAttemptedModelIdRef.current = selectedModel.id;

    const runtime = getLocalLLMRuntime();
    void runtime.ensureModelLoaded(selectedModel).catch((error) => {
      logger.error('Failed to warm local LLM model', error, {
        modelId: selectedModel.id,
      });
      lastAttemptedModelIdRef.current = null;
    });
  }, [enabled, selectedModel]);
}
