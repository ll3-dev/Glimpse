import { View, Text, TouchableOpacity } from 'react-native';
import { Eye, EyeOff, Key } from 'lucide-react-native';
import { Card, Input } from '@/src/ui/primitives';
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
    <View className="mb-6">
      <View className="flex-row items-center mb-3">
        <Key size={18} color="#787774" />
        <Text className="ml-2 text-sm font-bold text-app-muted uppercase tracking-tight">
          Bring Your Own Key
        </Text>
      </View>

      <Card className="p-4">
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
                    ? 'bg-app-primary border-app-primary'
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

        <TouchableOpacity
          className="bg-app-primary py-2.5 rounded-md items-center mb-3"
          onPress={onSaveKey}
        >
          <Text className="text-white text-xs font-bold">API 키 저장</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`py-2.5 rounded-md items-center ${
            byokConfigured ? 'bg-app-primary' : 'bg-app-border'
          }`}
          onPress={onToggleBYOK}
          disabled={!byokConfigured && !byokEnabled}
        >
          <Text className={`text-xs font-bold ${byokConfigured ? 'text-white' : 'text-app-muted'}`}>
            {byokEnabled ? 'BYOK 비활성화' : 'BYOK 활성화'}
          </Text>
        </TouchableOpacity>
      </Card>

      {!byokReady && !byokEnabled && (
        <Text className="mt-3 text-[10px] text-app-subtle font-medium text-center">
          BYOK를 활성화하려면 먼저 API 키를 저장해주세요
        </Text>
      )}
    </View>
  );
}
