import { Alert, ScrollView, TouchableOpacity, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ScreenHeader, Card } from '@glimpse/ui/primitives';
import { AITargetSettingsSection } from '@/src/components/settings/AITargetSettingsSection';
import { AppleIntelligenceSection } from '@/src/components/settings/AppleIntelligenceSection';
import { BYOKSectionContainer } from '@/src/components/settings/BYOKSectionContainer';
import { LocalLLMSection } from '@/src/components/settings/LocalLLMSection';
import { useSettingsScreenState } from '@/src/hooks';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { state, actions } = useSettingsScreenState();

  const handleToggleAppleIntelligence = (value: boolean) => {
    const feedback = actions.toggleAppleIntelligence(value);
    if (feedback) {
      Alert.alert(feedback.title, feedback.message);
    }
  };

  const handleToggleLocalLLM = (value: boolean) => {
    const feedback = actions.toggleLocalLLM(value);
    if (feedback) {
      Alert.alert(feedback.title, feedback.message);
    }
  };

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="설정"
        className="pb-2"
        leftElement={
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2"
          >
            <ArrowLeft size={24} color="#37352f" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <AITargetSettingsSection
          defaultTargetId={state.aiTargetSettings.defaultTargetId}
          metadataTargetId={state.aiTargetSettings.metadataTargetId}
          labelingTargetId={state.aiTargetSettings.labelingTargetId}
          chatTargetId={state.aiTargetSettings.chatTargetId}
          defaultOptions={state.aiTargetOptions.defaultOptions}
          metadataOptions={state.aiTargetOptions.metadataOptions}
          labelingOptions={state.aiTargetOptions.labelingOptions}
          chatOptions={state.aiTargetOptions.chatOptions}
          onSelectDefaultTarget={actions.selectDefaultTarget}
          onSelectFeatureTarget={actions.selectFeatureTarget}
          onSelectLabelingTarget={actions.selectLabelingTarget}
        />

        <LocalLLMSection
          enabled={state.localLLMEnabled}
          ready={state.localLLMReady}
          models={state.localLLMModels}
          selectedModelId={state.localLLMSelectedModelId}
          sourceRoute={typeof returnTo === 'string' ? returnTo : null}
          onToggle={handleToggleLocalLLM}
          onSelectModel={actions.selectLocalModel}
        />

        <AppleIntelligenceSection
          config={state.appleConfig}
          onToggle={handleToggleAppleIntelligence}
        />

        <BYOKSectionContainer />

        <Card variant="muted" className="p-4 border-0">
          <Text className="text-[10px] leading-4 text-app-muted font-medium">
            ⓘ API 키와 BYOK 설정은 로컬 스토리지(MMKV)에 저장됩니다.{"\n"}
            화면에는 마스킹된 키만 표시되며, Base URL override는 현재 OpenAI provider에서만 적용됩니다.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
