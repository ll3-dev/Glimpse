import { Alert, View } from 'react-native';
import { Key } from 'lucide-react-native';
import { Text, Switch } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { SettingsSection } from './SettingsSection';
import { BYOKApiKeyEditor } from './BYOKApiKeyEditor';
import { BYOKConnectionFields } from './BYOKConnectionFields';
import { BYOKProviderPicker } from './BYOKProviderPicker';
import { type BYOKProviderType } from '@/src/features/settings';

type BYOKSectionProps = {
  state: {
    providers: readonly BYOKProviderType[];
    selectedProvider: BYOKProviderType | null;
    apiKeyInput: string;
    baseUrlInput: string;
    modelInput: string;
    showKey: boolean;
    hasStoredApiKey: boolean;
    maskedStoredApiKey: string;
    isEditingApiKey: boolean;
    configured: boolean;
    enabled: boolean;
    ready: boolean;
    connectionTestStatus: 'idle' | 'testing';
  };
  actions: {
    selectProvider: (provider: BYOKProviderType) => void | Promise<void>;
    changeApiKey: (value: string) => void;
    changeBaseUrl: (value: string) => void;
    changeModel: (value: string) => void;
    toggleShowKey: () => void;
    startApiKeyEdit: () => void;
    cancelApiKeyEdit: () => void;
    saveConnectionConfig: () => void;
    saveKey: () => void | Promise<void>;
    toggleBYOK: () => void;
    testConnection?: () => void;
  };
};

export function BYOKSection({
  state,
  actions,
}: BYOKSectionProps) {
  const {
    providers,
    selectedProvider,
    apiKeyInput,
    baseUrlInput,
    modelInput,
    showKey,
    hasStoredApiKey,
    maskedStoredApiKey,
    isEditingApiKey,
    configured: byokConfigured,
    enabled: byokEnabled,
    ready: byokReady,
    connectionTestStatus,
  } = state;
  const isTestingConnection = connectionTestStatus === 'testing';
  const appMuted = useSemanticColor('appMuted');
  const disabled = !byokConfigured && !byokEnabled;
  const disabledReason = selectedProvider
    ? 'BYOK를 사용하려면 API 키를 먼저 저장해주세요.'
    : 'BYOK를 사용하려면 Provider를 선택하고 API 키를 저장해주세요.';

  const handleTogglePress = () => {
    if (disabled) {
      Alert.alert('BYOK 사용 불가', disabledReason);
      return;
    }

    actions.toggleBYOK();
  };

  return (
    <SettingsSection
      title="Bring Your Own Key"
      icon={<Key size={18} color={appMuted} />}
      footer={
        !byokReady && !byokEnabled
          ? disabledReason
          : undefined
      }
    >
      {/* BYOK Enable/Disable toggle */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-app-text">BYOK 사용</Text>
          <Text className="text-xs text-app-muted mt-0.5">
            저장된 API 키로 외부 AI 모델 사용
          </Text>
        </View>
        <Switch
          accessibilityLabel="BYOK 사용"
          accessibilityHint={disabled ? disabledReason : undefined}
          checked={byokEnabled}
          onCheckedChange={handleTogglePress}
          disabled={disabled}
        />
      </View>

      {/* Show details only when enabled */}
      {byokEnabled && (
        <View className="mt-4">
          <BYOKProviderPicker
            providers={providers}
            selectedProvider={selectedProvider}
            onSelect={actions.selectProvider}
          />
          <BYOKConnectionFields
            baseUrl={baseUrlInput}
            model={modelInput}
            onBaseUrlChange={actions.changeBaseUrl}
            onModelChange={actions.changeModel}
            onSave={actions.saveConnectionConfig}
          />
          <BYOKApiKeyEditor
            state={{
              apiKey: apiKeyInput,
              showKey,
              hasStoredApiKey,
              maskedStoredApiKey,
              isEditingApiKey,
              connectionTestStatus: isTestingConnection ? 'testing' : 'idle',
            }}
            actions={{
              changeApiKey: actions.changeApiKey,
              toggleShowKey: actions.toggleShowKey,
              startEdit: actions.startApiKeyEdit,
              cancelEdit: actions.cancelApiKeyEdit,
              saveKey: actions.saveKey,
              testConnection: actions.testConnection,
            }}
          />
        </View>
      )}
    </SettingsSection>
  );
}
