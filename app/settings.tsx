/**
 * Settings Screen
 *
 * Displays app settings including BYOK and Apple Intelligence configuration.
 */

import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Key, Eye, EyeOff, Cpu } from 'lucide-react-native';
import {
  getBYOKConfig,
  isBYOKReady,
  enableBYOK,
  disableBYOK,
  setApiKey,
  maskApiKey,
  type BYOKProviderType,
  BYOKProvider,
  getAppleIntelligenceConfig,
  setAppleIntelligenceEnabled,
} from '@/src/features/settings';
import { ScreenHeader, Card, Input } from '@/src/ui/primitives';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // BYOK state
  const config = getBYOKConfig();
  const [byokEnabled, setByokEnabled] = useState(config.enabled);
  const [selectedProvider, setSelectedProvider] = useState<BYOKProviderType | null>(config.provider);
  const [apiKey, setApiKeyState] = useState(config.apiKey || '');
  const [showKey, setShowKey] = useState(false);

  // Apple Intelligence state
  const appleConfig = getAppleIntelligenceConfig();
  const [appleIntelligenceEnabled, setAppleIntelligenceEnabledState] = useState(appleConfig.enabled);

  // Refresh Apple Intelligence config on mount
  useEffect(() => {
    setAppleIntelligenceEnabledState(appleConfig.enabled);
  }, [appleConfig.enabled]);

  const handleToggleBYOK = useCallback(() => {
    if (byokEnabled) {
      disableBYOK();
      setByokEnabled(false);
    } else {
      const result = enableBYOK();
      if (result.valid) {
        setByokEnabled(true);
      } else {
        Alert.alert('BYOK 활성화 실패', result.error);
      }
    }
  }, [byokEnabled]);

  const handleProviderSelect = useCallback((provider: BYOKProviderType) => {
    setSelectedProvider(provider);
    if (apiKey) {
      setApiKey(provider, apiKey);
    }
  }, [apiKey]);

  const handleSaveKey = useCallback(() => {
    if (!selectedProvider) {
      Alert.alert('오류', 'Provider를 먼저 선택해주세요');
      return;
    }

    if (!apiKey) {
      Alert.alert('오류', 'API 키를 입력해주세요');
      return;
    }

    const result = setApiKey(selectedProvider, apiKey);
    if (result.valid) {
      Alert.alert('저장 완료', 'API 키가 저장되었습니다');
    } else {
      Alert.alert('저장 실패', result.error);
    }
  }, [selectedProvider, apiKey]);

  const handleToggleAppleIntelligence = useCallback((value: boolean) => {
    const success = setAppleIntelligenceEnabled(value);
    if (success) {
      setAppleIntelligenceEnabledState(value);
    }
  }, []);

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <ScreenHeader
        title="설정"
        className="pb-2"
        rightElement={
          <TouchableOpacity onPress={() => router.back()} className="p-2.5 rounded-md bg-app-border/30">
            <ArrowLeft size={20} color="#37352f" />
          </TouchableOpacity>
        }
      />

      {/* Content */}
      <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Apple Intelligence Section */}
        <View className="mb-8">
          <View className="flex-row items-center mb-3">
            <Cpu size={18} color="#787774" />
            <Text className="ml-2 text-sm font-bold text-app-muted uppercase tracking-tight">
              Apple Intelligence
            </Text>
          </View>
          
          <Card className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-base font-semibold text-app-text">
                  Apple Intelligence 사용
                </Text>
                <Text className="text-xs text-app-muted mt-0.5">
                  온디바이스 AI로 프라이빗하고 빠른 추론을 경험하세요
                </Text>
                {!appleConfig.isAvailable && (
                  <Text className="text-[10px] text-red-500 font-bold mt-1 uppercase">
                    {appleConfig.unavailableReason}
                  </Text>
                )}
              </View>
              <Switch
                value={appleIntelligenceEnabled}
                onValueChange={handleToggleAppleIntelligence}
                disabled={!appleConfig.isAvailable}
                trackColor={{ false: '#e5e5e5', true: '#2383e2' }}
                thumbColor="#fff"
              />
            </View>
          </Card>

          {appleConfig.isAvailable && (
            <Text className="mt-2 text-[10px] text-app-subtle font-medium text-center">
              ⓘ iOS 18.1+ / macOS 15.1+에서 사용할 수 있습니다
            </Text>
          )}
        </View>

        {/* BYOK Section */}
        <View className="mb-6">
          <View className="flex-row items-center mb-3">
            <Key size={18} color="#787774" />
            <Text className="ml-2 text-sm font-bold text-app-muted uppercase tracking-tight">
              Bring Your Own Key
            </Text>
          </View>

          <Card className="p-4">
            {/* Provider Selection */}
            <View className="mb-5">
              <Text className="text-xs font-bold text-app-muted mb-2 uppercase tracking-tight">Provider</Text>
              <View className="flex-row gap-2">
                {BYOKProvider.map((provider) => (
                  <TouchableOpacity
                    key={provider}
                    className={`px-3 py-1.5 rounded-md border ${
                      selectedProvider === provider
                        ? 'bg-app-primary border-app-primary'
                        : 'bg-white border-app-border'
                    }`}
                    onPress={() => handleProviderSelect(provider)}
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

            {/* API Key Input */}
            <View className="mb-5">
              <Text className="text-xs font-bold text-app-muted mb-2 uppercase tracking-tight">API 키</Text>
              <View className="relative">
                <Input
                  className="pr-12"
                  placeholder="API 키를 입력하세요"
                  value={showKey ? apiKey : maskApiKey(apiKey)}
                  onChangeText={setApiKeyState}
                  secureTextEntry={!showKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  className="absolute right-0 top-0 bottom-0 px-4 justify-center"
                  onPress={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff size={16} color="#787774" />
                  ) : (
                    <Eye size={16} color="#787774" />
                  )}
                </TouchableOpacity>
              </View>
              {apiKey && (
                <Text className="mt-1.5 text-[10px] text-app-subtle font-medium">
                  저장된 키: {maskApiKey(apiKey)}
                </Text>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              className="bg-app-primary py-2.5 rounded-md items-center mb-3"
              onPress={handleSaveKey}
            >
              <Text className="text-white text-xs font-bold">API 키 저장</Text>
            </TouchableOpacity>

            {/* Enable/Disable Toggle */}
            <TouchableOpacity
              className={`py-2.5 rounded-md items-center ${
                isBYOKReady() ? 'bg-app-primary' : 'bg-app-border'
              }`}
              onPress={handleToggleBYOK}
              disabled={!isBYOKReady() && !byokEnabled}
            >
              <Text className={`text-xs font-bold ${isBYOKReady() ? 'text-white' : 'text-app-muted'}`}>
                {byokEnabled ? 'BYOK 비활성화' : 'BYOK 활성화'}
              </Text>
            </TouchableOpacity>
          </Card>

          {!isBYOKReady() && !byokEnabled && (
            <Text className="mt-3 text-[10px] text-app-subtle font-medium text-center">
              BYOK를 활성화하려면 먼저 API 키를 저장해주세요
            </Text>
          )}
        </View>

        {/* Info */}
        <Card className="p-4 bg-app-border/20 border-0">
          <Text className="text-[10px] leading-4 text-app-muted font-medium">
            ⓘ API 키는 기기에 안전하게 저장됩니다.{'\n'}
            실제 API 호출은 추후 업데이트에서 지원될 예정입니다.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
