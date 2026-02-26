import { View, TouchableOpacity } from 'react-native';
import { Eye, EyeOff, Key } from 'lucide-react-native';
import { Input, Button, Text } from '@/src/ui/primitives';
import { SettingsSection } from './SettingsSection';
import { type BYOKProviderType } from '@/src/features/settings';

type BYOKSectionProps = {
  providers: readonly BYOKProviderType[];
  selectedProvider: BYOKProviderType | null;
  apiKeyInput: string;
  baseUrlInput: string;
  modelInput: string;
  showKey: boolean;
  hasStoredApiKey: boolean;
  maskedStoredApiKey: string;
  isEditingApiKey: boolean;
  byokConfigured: boolean;
  byokEnabled: boolean;
  byokReady: boolean;
  onProviderSelect: (provider: BYOKProviderType) => void;
  onApiKeyChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onToggleShowKey: () => void;
  onStartApiKeyEdit: () => void;
  onCancelApiKeyEdit: () => void;
  onSaveConnectionConfig: () => void;
  onSaveKey: () => void;
  onToggleBYOK: () => void;
};

export function BYOKSection({
  providers,
  selectedProvider,
  apiKeyInput,
  baseUrlInput,
  modelInput,
  showKey,
  hasStoredApiKey,
  maskedStoredApiKey,
  isEditingApiKey,
  byokConfigured,
  byokEnabled,
  byokReady,
  onProviderSelect,
  onApiKeyChange,
  onBaseUrlChange,
  onModelChange,
  onToggleShowKey,
  onStartApiKeyEdit,
  onCancelApiKeyEdit,
  onSaveConnectionConfig,
  onSaveKey,
  onToggleBYOK,
}: BYOKSectionProps) {
  return (
    <SettingsSection
      title="Bring Your Own Key"
      icon={<Key size={18} color="#787774" />}
      footer={
        !byokReady && !byokEnabled
          ? "BYOK를 활성화하려면 먼저 API 키를 저장해주세요"
          : undefined
      }
    >
      <View className="mb-5">
        <Text className="text-xs font-bold text-app-muted mb-2 uppercase tracking-tight">
          Provider
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {providers.map((provider) => (
            <TouchableOpacity
              key={provider}
              className={`px-3 py-1.5 rounded-md border ${
                selectedProvider === provider
                  ? 'bg-app-text border-app-text'
                  : 'bg-white border-app-border'
              }`}
              onPress={() => onProviderSelect(provider)}
            >
              <Text
                className={`text-xs font-bold uppercase ${
                  selectedProvider === provider ? 'text-white' : 'text-app-text'
                }`}
              >
                {provider}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View className="mb-5">
        <Text className="text-xs font-bold text-app-muted mb-2 uppercase tracking-tight">
          연결 설정
        </Text>
        <Input
          className="mb-2"
          placeholder="Base URL (OpenAI에서만 override 적용)"
          value={baseUrlInput}
          onChangeText={onBaseUrlChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input
          placeholder="Model (예: gpt-4o-mini)"
          value={modelInput}
          onChangeText={onModelChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Button onPress={onSaveConnectionConfig} variant="outline" className="mb-5">
        <Text>연결 설정 저장</Text>
      </Button>

      <View className="mb-5">
        <Text className="text-xs font-bold text-app-muted mb-2 uppercase tracking-tight">
          API 키
        </Text>
        {hasStoredApiKey && !isEditingApiKey ? (
          <View className="rounded-md border border-app-border bg-white px-3 py-3">
            <Text className="text-xs text-app-subtle font-medium mb-3">
              저장된 키: {maskedStoredApiKey}
            </Text>
            <Button onPress={onStartApiKeyEdit} variant="outline">
              <Text>API 키 변경</Text>
            </Button>
          </View>
        ) : (
          <View>
            <View className="relative">
              <Input
                className="pr-12"
                placeholder="새 API 키를 입력하세요"
                value={apiKeyInput}
                onChangeText={onApiKeyChange}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                className="absolute right-0 top-0 bottom-0 px-4 justify-center"
                onPress={onToggleShowKey}
              >
                {showKey ? (
                  <EyeOff size={16} color="#787774" />
                ) : (
                  <Eye size={16} color="#787774" />
                )}
              </TouchableOpacity>
            </View>
            {hasStoredApiKey && (
              <Button onPress={onCancelApiKeyEdit} variant="ghost" className="mt-2">
                <Text>키 변경 취소</Text>
              </Button>
            )}
          </View>
        )}
      </View>

      {(!hasStoredApiKey || isEditingApiKey) && (
        <Button onPress={onSaveKey} className="mb-3">
          <Text>
            {hasStoredApiKey ? '새 API 키 저장' : 'API 키 저장'}
          </Text>
        </Button>
      )}

      <Button
        variant={byokConfigured ? "default" : "outline"}
        onPress={onToggleBYOK}
        disabled={!byokConfigured && !byokEnabled}
      >
        <Text>
          {byokEnabled ? 'BYOK 비활성화' : 'BYOK 활성화'}
        </Text>
      </Button>
    </SettingsSection>
  );
}
