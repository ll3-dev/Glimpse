import { useCallback } from 'react';
import {
  disableLocalLLM,
  enableLocalLLM,
  selectLocalLLMModel,
  setAppleIntelligenceEnabled,
  useAppleIntelligenceConfig,
  useAvailableLocalModels,
  useLocalLLMEnabled,
  useLocalLLMReady,
  useSelectedLocalModelId,
} from '@/src/features/settings';

export type ActionFeedback = {
  title: string;
  message: string;
};

export function useSettingsScreenState() {
  // Apple Intelligence state
  const appleConfig = useAppleIntelligenceConfig();

  // Local LLM state
  const localLLMEnabled = useLocalLLMEnabled();
  const localLLMReady = useLocalLLMReady();
  const localLLMModels = useAvailableLocalModels();
  const localLLMSelectedModelId = useSelectedLocalModelId();

  // Apple Intelligence actions
  const toggleAppleIntelligence = useCallback(
    (enabled: boolean): ActionFeedback | null => {
      if (!setAppleIntelligenceEnabled(enabled) && enabled) {
        return {
          title: '설정 실패',
          message:
            appleConfig.unavailableReason ||
            '현재 기기에서 Apple Intelligence를 사용할 수 없습니다',
        };
      }

      return null;
    },
    [appleConfig.unavailableReason]
  );

  // Local LLM actions
  const toggleLocalLLM = useCallback((value: boolean): ActionFeedback | null => {
    if (value) {
      const result = enableLocalLLM();
      if (!result.success) {
        return {
          title: '활성화 실패',
          message: result.error ?? '로컬 LLM을 활성화할 수 없습니다.',
        };
      }
    } else {
      disableLocalLLM();
    }
    return null;
  }, []);

  const selectLocalModel = useCallback((modelId: string) => {
    selectLocalLLMModel(modelId);
  }, []);

  return {
    state: {
      appleConfig,
      localLLMEnabled,
      localLLMReady,
      localLLMModels,
      localLLMSelectedModelId,
    },
    actions: {
      toggleAppleIntelligence,
      toggleLocalLLM,
      selectLocalModel,
    },
  };
}
