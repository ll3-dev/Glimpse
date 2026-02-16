import { Alert, ScrollView, TouchableOpacity, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ScreenHeader, Card } from '@/src/ui/primitives';
import { AppleIntelligenceSection } from '@/src/components/settings/AppleIntelligenceSection';
import { BYOKSection } from '@/src/components/settings/BYOKSection';
import { useSettingsScreenState } from '@/src/components/settings/useSettingsScreenState';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, actions } = useSettingsScreenState();

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

  const handleToggleAppleIntelligence = (value: boolean) => {
    const feedback = actions.toggleAppleIntelligence(value);
    if (feedback) {
      Alert.alert(feedback.title, feedback.message);
    }
  };

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="설정"
        className="pb-2"
        rightElement={
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2.5 rounded-md bg-app-border/30"
          >
            <ArrowLeft size={20} color="#37352f" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <AppleIntelligenceSection
          config={state.appleConfig}
          onToggle={handleToggleAppleIntelligence}
        />

        <BYOKSection
          providers={state.providers}
          selectedProvider={state.selectedProvider}
          apiKeyInput={state.apiKeyInput}
          showKey={state.showKey}
          byokConfigured={state.byokConfigured}
          byokEnabled={state.byokEnabled}
          byokReady={state.byokReady}
          onProviderSelect={actions.selectProvider}
          onApiKeyChange={actions.setApiKeyInput}
          onToggleShowKey={() => actions.setShowKey(!state.showKey)}
          onSaveKey={handleSaveKey}
          onToggleBYOK={handleToggleBYOK}
        />

        <Card className="p-4 bg-app-border/20 border-0">
          <Text className="text-[10px] leading-4 text-app-muted font-medium">
            ⓘ API 키는 현재 앱 세션 메모리에만 보관됩니다.{"\n"}
            앱을 종료하면 초기화되며, 실제 API 호출은 추후 업데이트에서 지원됩니다.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
