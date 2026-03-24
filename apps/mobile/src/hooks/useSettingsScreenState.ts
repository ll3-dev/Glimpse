import { useCallback } from 'react';
import {
  useAppleIntelligenceConfig,
  useAvailableLocalModels,
  useLocalLLMEnabled,
  useLocalLLMReady,
  useSelectedLocalModelId,
  useBYOKConfig,
  selectLocalLLMModel,
  disableLocalLLM,
  enableLocalLLM,
  enableAppleIntelligence,
  disableAppleIntelligence,
} from '@/src/features/settings';
import { listSelectableTargets, type AIFeature } from '@/src/features/ai/targets';
import {
  setChatAITargetId,
  setDefaultAITargetId,
  setLabelingAITargetId,
  setMetadataAITargetId,
  useAITargetSettings,
} from '@/src/stores/settings/ai-targets.store';

export type ActionFeedback = {
  title: string;
  message: string;
};

export function useSettingsScreenState() {
  const appleConfig = useAppleIntelligenceConfig();
  const localLLMEnabled = useLocalLLMEnabled();
  const localLLMReady = useLocalLLMReady();
  const localLLMModels = useAvailableLocalModels();
  const localLLMSelectedModelId = useSelectedLocalModelId();
  useBYOKConfig((config) => `${config.enabled}:${config.provider ?? ''}:${config.model ?? ''}:${config.apiKey ? '1' : '0'}`);

  const aiTargetSettings = useAITargetSettings((settings) => settings);
  const defaultOptions = listSelectableTargets('metadata').filter(
    (target) => target.kind !== 'rules'
  );
  const metadataOptions = listSelectableTargets('metadata');
  const labelingOptions = listSelectableTargets('labeling');
  const chatOptions = listSelectableTargets('chat');

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

      if (enabled) {
        if (!enableAppleIntelligence()) {
          return {
            title: '설정 실패',
            message:
              appleConfig.unavailableReason ||
              '현재 기기에서 Apple Intelligence를 사용할 수 없습니다',
          };
        }
      } else {
        disableAppleIntelligence();
      }

      return null;
    },
    [appleConfig.isAvailable, appleConfig.isCheckingAvailability, appleConfig.unavailableReason]
  );

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
    selectLocalLLMModel(modelId || null);
  }, []);

  const selectDefaultTarget = useCallback((targetId: string) => {
    setDefaultAITargetId(targetId);
  }, []);

  const selectFeatureTarget = useCallback(
    (feature: Exclude<AIFeature, 'labeling'>, targetId: string | null) => {
      if (feature === 'metadata') {
        setMetadataAITargetId(targetId);
        return;
      }

      setChatAITargetId(targetId);
    },
    []
  );

  const selectLabelingTarget = useCallback((targetId: string) => {
    setLabelingAITargetId(targetId);
  }, []);

  return {
    state: {
      appleConfig,
      localLLMEnabled,
      localLLMReady,
      localLLMModels,
      localLLMSelectedModelId,
      aiTargetSettings,
      aiTargetOptions: {
        defaultOptions,
        metadataOptions,
        labelingOptions,
        chatOptions,
      },
    },
    actions: {
      toggleAppleIntelligence,
      toggleLocalLLM,
      selectLocalModel,
      selectDefaultTarget,
      selectFeatureTarget,
      selectLabelingTarget,
    },
  };
}
