import { useState } from 'react';
import { Alert } from 'react-native';
import { BYOKSection } from './BYOKSection';
import { useBYOKSectionState } from '@/src/hooks';
import { testBYOKConnection } from '@/src/features/settings/testBYOKConnection';
import { toast } from '@/src/stores/toast.store';

export function BYOKSectionContainer() {
  const { state, actions } = useBYOKSectionState();
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleSaveKey = async () => {
    const feedback = await actions.saveApiKey();
    Alert.alert(feedback.title, feedback.message);
  };

  const handleProviderSelect = async (provider: (typeof state.providers)[number]) => {
    const feedback = await actions.selectProvider(provider);
    if (feedback) {
      Alert.alert(feedback.title, feedback.message);
    }
  };

  const handleToggleBYOK = () => {
    const feedback = actions.toggleBYOK();
    if (feedback) {
      Alert.alert(feedback.title, feedback.message);
    }
  };

  const handleSaveConnectionConfig = () => {
    const feedback = actions.saveConnectionConfig();
    Alert.alert(feedback.title, feedback.message);
  };

  const handleTestConnection = async () => {
    if (!state.selectedProvider) {
      Alert.alert('알림', 'Provider를 먼저 선택해주세요.');
      return;
    }

    const keyToTest = state.apiKeyInput.trim() || state.storedApiKey;
    if (!keyToTest) {
      Alert.alert('알림', '테스트할 API 키를 입력하거나 먼저 저장해주세요.');
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await testBYOKConnection({
        provider: state.selectedProvider,
        apiKey: keyToTest,
        baseUrl: state.baseUrlInput,
        model: state.modelInput,
      });

      if (result.success) {
        toast.success(result.message);
        Alert.alert(
          '연결 성공',
          `${state.selectedProvider.toUpperCase()} API와 정상적으로 통신되었습니다.\n응답 속도: ${result.latencyMs}ms`
        );
      } else {
        toast.error(result.message);
        Alert.alert('연결 실패', result.message);
      }
    } catch (err) {
      Alert.alert('연결 오류', err instanceof Error ? err.message : String(err));
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <BYOKSection
      state={{
        providers: state.providers,
        selectedProvider: state.selectedProvider,
        apiKeyInput: state.apiKeyInput,
        baseUrlInput: state.baseUrlInput,
        modelInput: state.modelInput,
        showKey: state.showKey,
        hasStoredApiKey: state.hasStoredApiKey,
        maskedStoredApiKey: state.maskedStoredApiKey,
        isEditingApiKey: state.isEditingApiKey,
        configured: state.byokConfigured,
        enabled: state.byokEnabled,
        ready: state.byokReady,
        connectionTestStatus: isTestingConnection ? 'testing' : 'idle',
      }}
      actions={{
        selectProvider: handleProviderSelect,
        changeApiKey: actions.setApiKeyInput,
        changeBaseUrl: actions.setBaseUrlInput,
        changeModel: actions.setModelInput,
        toggleShowKey: () => actions.setShowKey(!state.showKey),
        startApiKeyEdit: actions.startApiKeyEdit,
        cancelApiKeyEdit: actions.cancelApiKeyEdit,
        saveConnectionConfig: handleSaveConnectionConfig,
        saveKey: handleSaveKey,
        toggleBYOK: handleToggleBYOK,
        testConnection: handleTestConnection,
      }}
    />
  );
}
