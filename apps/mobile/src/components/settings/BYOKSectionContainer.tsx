import { useState } from 'react';
import { Alert } from 'react-native';
import { BYOKSection } from './BYOKSection';
import { useBYOKSectionState } from '@/src/hooks';
import { testBYOKConnection } from '@/src/features/settings/testBYOKConnection';
import { toast } from '@/src/stores/toast.store';

export function BYOKSectionContainer() {
  const { state, actions } = useBYOKSectionState();
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleSaveKey = () => {
    const feedback = actions.saveApiKey();
    Alert.alert(feedback.title, feedback.message);
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
      providers={state.providers}
      selectedProvider={state.selectedProvider}
      apiKeyInput={state.apiKeyInput}
      baseUrlInput={state.baseUrlInput}
      modelInput={state.modelInput}
      showKey={state.showKey}
      hasStoredApiKey={state.hasStoredApiKey}
      maskedStoredApiKey={state.maskedStoredApiKey}
      isEditingApiKey={state.isEditingApiKey}
      byokConfigured={state.byokConfigured}
      byokEnabled={state.byokEnabled}
      byokReady={state.byokReady}
      isTestingConnection={isTestingConnection}
      onProviderSelect={actions.selectProvider}
      onApiKeyChange={actions.setApiKeyInput}
      onBaseUrlChange={actions.setBaseUrlInput}
      onModelChange={actions.setModelInput}
      onToggleShowKey={() => actions.setShowKey(!state.showKey)}
      onStartApiKeyEdit={actions.startApiKeyEdit}
      onCancelApiKeyEdit={actions.cancelApiKeyEdit}
      onSaveConnectionConfig={handleSaveConnectionConfig}
      onSaveKey={handleSaveKey}
      onToggleBYOK={handleToggleBYOK}
      onTestConnection={handleTestConnection}
    />
  );
}
