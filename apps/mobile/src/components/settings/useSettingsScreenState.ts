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
      if (enabled && appleConfig.isCheckingAvailability) {
        return {
          title: '확인 중',
          message: '이 기기의 Apple Intelligence 지원 여부를 확인하고 있습니다.',
        };
      }

      if (enabled && !appleConfig.isAvailable) {
        return {
          title: '설정 실패',
          message:
            appleConfig.unavailableReason ||
            '현재 기기에서 Apple Intelligence를 사용할 수 없습니다',
        };
      }

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
    [appleConfig.isAvailable, appleConfig.isCheckingAvailability, appleConfig.unavailableReason]
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
