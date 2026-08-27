import { useCallback, useState } from 'react';
import {
  BYOKProvider,
  disableBYOK,
  enableBYOK,
  maskApiKey,
  setApiKey,
  setBaseUrl,
  setModel,
  setProvider,
  useBYOKConfig,
  useBYOKCredentialsConfigured,
  useBYOKReady,
  type BYOKProviderType,
} from '@/src/features/settings';

export type BYOKActionFeedback = {
  title: string;
  message: string;
};

export function useBYOKSectionState() {
  const byokEnabled = useBYOKConfig((config) => config.enabled);
  const selectedProvider = useBYOKConfig((config) => config.provider);
  const storedApiKey = useBYOKConfig((config) => config.apiKey);
  const storedBaseUrl = useBYOKConfig((config) => config.baseUrl);
  const storedModel = useBYOKConfig((config) => config.model);
  const byokReady = useBYOKReady();
  const byokConfigured = useBYOKCredentialsConfigured();

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState(storedBaseUrl || '');
  const [modelInput, setModelInput] = useState(storedModel || '');
  const [showKey, setShowKey] = useState(false);
  const [isEditingApiKey, setIsEditingApiKey] = useState(storedApiKey === null);
  // 외부 스토어(보안 저장소) 값 대비 변경분만 반영하기 위한 추적 상태.
  // effect에서 setState하는 패턴(react-hooks/set-state-in-effect)을 피하고
  // 렌더 중 상태 조정으로 동기화한다.
  const [lastStored, setLastStored] = useState({
    apiKey: storedApiKey,
    baseUrl: storedBaseUrl,
    model: storedModel,
  });
  const maskedStoredApiKey = maskApiKey(storedApiKey);

  if (
    lastStored.apiKey !== storedApiKey ||
    lastStored.baseUrl !== storedBaseUrl ||
    lastStored.model !== storedModel
  ) {
    if (lastStored.apiKey !== storedApiKey) {
      setIsEditingApiKey(!storedApiKey);
      setApiKeyInput('');
      setShowKey(false);
    }
    setBaseUrlInput(storedBaseUrl || '');
    setModelInput(storedModel || '');
    setLastStored({ apiKey: storedApiKey, baseUrl: storedBaseUrl, model: storedModel });
  }
  const hasStoredApiKey = storedApiKey !== null;

  const toggleBYOK = useCallback((): BYOKActionFeedback | null => {
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

  const selectProvider = useCallback(async (provider: BYOKProviderType) => {
    try {
      await setProvider(provider);
      setShowKey(false);
      return null;
    } catch (error) {
      return {
        title: 'Provider 변경 실패',
        message:
          error instanceof Error
            ? error.message
            : '보안 저장소를 갱신할 수 없습니다.',
      };
    }
  }, []);

  const saveApiKey = useCallback(async (): Promise<BYOKActionFeedback> => {
    if (!selectedProvider) {
      return {
        title: '오류',
        message: 'Provider를 먼저 선택해주세요',
      };
    }

    if (!apiKeyInput.trim()) {
      return {
        title: '오류',
        message: hasStoredApiKey ? '변경할 API 키를 입력해주세요' : 'API 키를 입력해주세요',
      };
    }

    try {
      const result = await setApiKey(selectedProvider, apiKeyInput);
      if (!result.valid) {
        return {
          title: '저장 실패',
          message: result.error ?? 'API 키를 저장할 수 없습니다',
        };
      }

      setApiKeyInput('');
      setIsEditingApiKey(false);
      setShowKey(false);
      return {
        title: '저장 완료',
        message: 'API 키가 저장되었습니다',
      };
    } catch (error) {
      return {
        title: '저장 실패',
        message:
          error instanceof Error
            ? error.message
            : '보안 저장소에 API 키를 저장할 수 없습니다.',
      };
    }
  }, [selectedProvider, apiKeyInput, hasStoredApiKey]);

  const startApiKeyEdit = useCallback(() => {
    setIsEditingApiKey(true);
    setApiKeyInput('');
    setShowKey(false);
  }, []);

  const cancelApiKeyEdit = useCallback(() => {
    if (!hasStoredApiKey) {
      return;
    }
    setIsEditingApiKey(false);
    setApiKeyInput('');
    setShowKey(false);
  }, [hasStoredApiKey]);

  const saveConnectionConfig = useCallback((): BYOKActionFeedback => {
    if (!selectedProvider) {
      return {
        title: '오류',
        message: 'Provider를 먼저 선택해주세요',
      };
    }

    const baseUrlResult = setBaseUrl(baseUrlInput);
    if (!baseUrlResult.valid) {
      return {
        title: '저장 실패',
        message: baseUrlResult.error ?? 'Base URL을 저장할 수 없습니다',
      };
    }

    const modelResult = setModel(modelInput);
    if (!modelResult.valid) {
      return {
        title: '저장 실패',
        message: modelResult.error ?? 'Model을 저장할 수 없습니다',
      };
    }

    return {
      title: '저장 완료',
      message: 'BYOK 연결 설정이 저장되었습니다',
    };
  }, [selectedProvider, baseUrlInput, modelInput]);

  return {
    state: {
      byokEnabled,
      selectedProvider,
      apiKeyInput,
      baseUrlInput,
      modelInput,
      showKey,
      storedApiKey,
      hasStoredApiKey,
      maskedStoredApiKey,
      isEditingApiKey,
      byokReady,
      byokConfigured,
      providers: BYOKProvider,
    },
    actions: {
      setApiKeyInput,
      setBaseUrlInput,
      setModelInput,
      setShowKey,
      toggleBYOK,
      selectProvider,
      saveApiKey,
      saveConnectionConfig,
      startApiKeyEdit,
      cancelApiKeyEdit,
    },
  };
}
