import { Alert } from 'react-native';
import { BYOKSection } from './BYOKSection';
import { useBYOKSectionState } from './useBYOKSectionState';

export function BYOKSectionContainer() {
  const { state, actions } = useBYOKSectionState();

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
    />
  );
}

