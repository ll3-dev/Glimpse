import { useCallback, useEffect, useState } from 'react';
import {
  BYOKProvider,
  disableBYOK,
  enableBYOK,
  setApiKey,
  setAppleIntelligenceEnabled,
  setProvider,
  useAppleIntelligenceConfig,
  useBYOKConfig,
  useBYOKCredentialsConfigured,
  useBYOKReady,
  type BYOKProviderType,
} from '@/src/features/settings';

export type ActionFeedback = {
  title: string;
  message: string;
};

export function useSettingsScreenState() {
  const byokEnabled = useBYOKConfig((config) => config.enabled);
  const selectedProvider = useBYOKConfig((config) => config.provider);
  const storedApiKey = useBYOKConfig((config) => config.apiKey);
  const byokReady = useBYOKReady();
  const byokConfigured = useBYOKCredentialsConfigured();
  const appleConfig = useAppleIntelligenceConfig();

  const [apiKeyInput, setApiKeyInput] = useState(storedApiKey || '');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setApiKeyInput(storedApiKey || '');
  }, [storedApiKey]);

  const toggleBYOK = useCallback((): ActionFeedback | null => {
    if (byokEnabled) {
      disableBYOK();
      return null;
    }

    const result = enableBYOK();
    if (result.valid) {
      return null;
    }

    return {
      title: 'BYOK 활성화 실패',
      message: result.error ?? 'BYOK를 활성화할 수 없습니다.',
    };
  }, [byokEnabled]);

  const selectProvider = useCallback(
    (provider: BYOKProviderType) => {
      setProvider(provider);
      if (apiKeyInput) {
        setApiKey(provider, apiKeyInput);
      }
    },
    [apiKeyInput]
  );

  const saveApiKey = useCallback((): ActionFeedback => {
    if (!selectedProvider) {
      return {
        title: '오류',
        message: 'Provider를 먼저 선택해주세요',
      };
    }

    if (!apiKeyInput) {
      return {
        title: '오류',
        message: 'API 키를 입력해주세요',
      };
    }

    const result = setApiKey(selectedProvider, apiKeyInput);
    if (result.valid) {
      return {
        title: '저장 완료',
        message: 'API 키가 저장되었습니다',
      };
    }

    return {
      title: '저장 실패',
      message: result.error ?? 'API 키를 저장할 수 없습니다',
    };
  }, [selectedProvider, apiKeyInput]);

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

  return {
    state: {
      byokEnabled,
      selectedProvider,
      apiKeyInput,
      showKey,
      byokReady,
      byokConfigured,
      appleConfig,
      providers: BYOKProvider,
    },
    actions: {
      setApiKeyInput,
      setShowKey,
      toggleBYOK,
      selectProvider,
      saveApiKey,
      toggleAppleIntelligence,
    },
  };
}
