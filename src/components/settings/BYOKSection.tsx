import { View, TouchableOpacity } from 'react-native';
import { Eye, EyeOff, Key } from 'lucide-react-native';
import { Input, Button, Text } from '@/src/ui/primitives';
import { SettingsSection } from './SettingsSection';
import { maskApiKey, type BYOKProviderType } from '@/src/features/settings';

type BYOKSectionProps = {
  providers: readonly BYOKProviderType[];
  selectedProvider: BYOKProviderType | null;
  apiKeyInput: string;
  showKey: boolean;
  byokConfigured: boolean;
  byokEnabled: boolean;
  byokReady: boolean;
  onProviderSelect: (provider: BYOKProviderType) => void;
  onApiKeyChange: (value: string) => void;
  onToggleShowKey: () => void;
  onSaveKey: () => void;
  onToggleBYOK: () => void;
};

export function BYOKSection({
  providers,
  selectedProvider,
  apiKeyInput,
  showKey,
  byokConfigured,
  byokEnabled,
  byokReady,
  onProviderSelect,
  onApiKeyChange,
  onToggleShowKey,
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
        <View className="flex-row gap-2">
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
          API 키
        </Text>
        <View className="relative">
          <Input
            className="pr-12"
            placeholder="API 키를 입력하세요"
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
        {apiKeyInput && !showKey && (
          <Text className="mt-1.5 text-[10px] text-app-subtle font-medium">
            저장된 키: {maskApiKey(apiKeyInput)}
          </Text>
        )}
      </View>

      <Button onPress={onSaveKey} className="mb-3">
        <Text>API 키 저장</Text>
      </Button>

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
