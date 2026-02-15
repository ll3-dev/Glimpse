/**
 * Settings Screen
 *
 * Displays app settings including BYOK and Apple Intelligence configuration.
 */

import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
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
      <View className="flex-row items-center px-4 py-3 border-b border-app-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#37352f" />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-bold text-app-text">설정</Text>
      </View>

      {/* Content */}
      <View className="flex-1 p-6">
        {/* Apple Intelligence Section */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <Cpu size={20} color="#37352f" />
            <Text className="ml-2 text-base font-semibold text-app-text">
              Apple Intelligence
            </Text>
          </View>
          <Text className="text-sm text-app-subtle mb-4">
            온디바이스 AI로 프라이빗하고 빠른 추론을 경험하세요
          </Text>

          <View className="flex-row items-center justify-between bg-white p-4 rounded-lg border border-app-border">
            <View className="flex-1">
              <Text className="text-sm font-medium text-app-text">
                Apple Intelligence 사용
              </Text>
              {!appleConfig.isAvailable && (
                <Text className="text-xs text-red-500 mt-1">
                  {appleConfig.unavailableReason}
                </Text>
              )}
            </View>
            <Switch
              value={appleIntelligenceEnabled}
              onValueChange={handleToggleAppleIntelligence}
              disabled={!appleConfig.isAvailable}
              trackColor={{ false: '#e5e5e5', true: '#34c759' }}
              thumbColor="#fff"
            />
          </View>

          {appleConfig.isAvailable && (
            <Text className="mt-2 text-xs text-app-subtle">
              ⓘ iOS 18.1+ / macOS 15.1+에서 사용할 수 있습니다
            </Text>
          )}
        </View>

        {/* Divider */}
        <View className="h-px bg-app-border mb-8" />

        {/* BYOK Section */}
        <View className="mb-6">
          <View className="flex-row items-center mb-4">
            <Key size={20} color="#37352f" />
            <Text className="ml-2 text-base font-semibold text-app-text">
              BYOK (Bring Your Own Key)
            </Text>
          </View>
          <Text className="text-sm text-app-subtle mb-4">
            자신의 API 키를 사용하여 AI 기능을 이용할 수 있습니다
          </Text>

          {/* Provider Selection */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-app-text mb-2">Provider</Text>
            <View className="flex-row gap-2">
              {BYOKProvider.map((provider) => (
                <TouchableOpacity
                  key={provider}
                  className={`px-4 py-2 rounded-lg border ${
                    selectedProvider === provider
                      ? 'bg-black border-black'
                      : 'bg-white border-app-border'
                  }`}
                  onPress={() => handleProviderSelect(provider)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedProvider === provider ? 'text-white' : 'text-app-text'
                    }`}
                  >
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* API Key Input */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-app-text mb-2">API 키</Text>
            <View className="flex-row items-center border border-app-border rounded-lg bg-white">
              <TextInput
                className="flex-1 px-4 py-3 text-sm text-app-text"
                placeholder="API 키를 입력하세요"
                placeholderTextColor="#9ca3af"
                value={showKey ? apiKey : maskApiKey(apiKey)}
                onChangeText={setApiKeyState}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                className="px-4"
                onPress={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff size={20} color="#6b7280" />
                ) : (
                  <Eye size={20} color="#6b7280" />
                )}
              </TouchableOpacity>
            </View>
            {apiKey && (
              <Text className="mt-1 text-xs text-app-subtle">
                저장된 키: {maskApiKey(apiKey)}
              </Text>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            className="bg-black py-3 rounded-lg items-center mb-4"
            onPress={handleSaveKey}
          >
            <Text className="text-white font-semibold">API 키 저장</Text>
          </TouchableOpacity>

          {/* Enable/Disable Toggle */}
          <TouchableOpacity
            className={`py-3 rounded-lg items-center ${
              isBYOKReady() ? 'bg-green-500' : 'bg-gray-300'
            }`}
            onPress={handleToggleBYOK}
            disabled={!isBYOKReady() && !byokEnabled}
          >
            <Text className="text-white font-semibold">
              {byokEnabled ? 'BYOK 비활성화' : 'BYOK 활성화'}
            </Text>
          </TouchableOpacity>

          {!isBYOKReady() && !byokEnabled && (
            <Text className="mt-2 text-xs text-app-subtle text-center">
              BYOK를 활성화하려면 먼저 API 키를 저장해주세요
            </Text>
          )}
        </View>

        {/* Info */}
        <View className="mt-4 p-4 bg-gray-100 rounded-lg">
          <Text className="text-xs text-app-subtle">
            ⓘ API 키는 기기에 안전하게 저장됩니다.{'\n'}
            실제 API 호출은 추후 업데이트에서 지원될 예정입니다.
          </Text>
        </View>
      </View>
    </View>
  );
}
