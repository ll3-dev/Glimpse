import { Alert, Pressable, ScrollView, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ScreenHeader, Card } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { AITargetSettingsSection } from '@/src/components/settings/AITargetSettingsSection';
import { AppleIntelligenceSection } from '@/src/components/settings/AppleIntelligenceSection';
import { BYOKSectionContainer } from '@/src/components/settings/BYOKSectionContainer';
import { SemanticSearchSection } from '@/src/components/settings/SemanticSearchSection';
import { DataManagementSection } from '@/src/components/settings/DataManagementSection';
import { LocalLLMSection } from '@/src/components/settings/LocalLLMSection';
import { LanguageSection } from '@/src/components/settings/LanguageSection';
import { DesktopSyncSection } from '@/src/components/settings/DesktopSyncSection';
import { ReviewReminderSection } from '@/src/components/settings/ReviewReminderSection';
import { useDataManagementActions, useSettingsScreenState } from '@/src/hooks';
import { useAppLocale } from '@/src/localization';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, actions } = useSettingsScreenState();
  const dataActions = useDataManagementActions();
  const { messages } = useAppLocale();
  const appText = useSemanticColor('appText');

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

  const handleOpenLocalModels = () => {
    router.push('/local-models');
  };

  const handleExportData = async () => {
    try {
      await dataActions.exportToClipboard();
      Alert.alert(messages.settings.exportDoneTitle, messages.settings.exportDoneMessage);
    } catch (error) {
      Alert.alert(
        messages.settings.exportFailedTitle,
        errorMessage(error, messages.settings.unknownError),
      );
    }
  };

  const handleImportData = () => {
    Alert.alert(
      messages.settings.importConfirmTitle,
      messages.settings.importConfirmMessage,
      [
        { text: messages.common.cancel, style: 'cancel' },
        {
          text: messages.settings.importAction,
          onPress: async () => {
            try {
              const summary = await dataActions.importFromClipboard();
              Alert.alert(
                messages.settings.importDoneTitle,
                messages.settings.importedSummary(
                  summary.knowledgeItems,
                  summary.conversations,
                  summary.messages,
                ),
              );
            } catch (error) {
              Alert.alert(
                messages.settings.importFailedTitle,
                errorMessage(error, messages.settings.unknownError),
              );
            }
          },
        },
      ],
    );
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      messages.settings.deleteConfirmTitle,
      messages.settings.deleteConfirmMessage,
      [
        { text: messages.common.cancel, style: 'cancel' },
        {
          text: messages.settings.deleteAction,
          style: 'destructive',
          onPress: async () => {
            try {
              await dataActions.deleteAllData();
              Alert.alert(messages.settings.deleteDoneTitle, messages.settings.deleteDoneMessage);
            } catch (error) {
              Alert.alert(
                messages.settings.deleteFailedTitle,
                errorMessage(error, messages.settings.unknownError),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title={messages.settings.title}
        className="pb-2"
        leftElement={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={messages.common.back}
            onPress={() => router.back()}
            className="-ml-2 min-h-11 min-w-11 items-center justify-center active:opacity-70"
          >
            <ArrowLeft size={24} color={appText} />
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1 px-6 pt-4"
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
          onToggle={handleToggleLocalLLM}
          onManageModels={handleOpenLocalModels}
        />

        <AppleIntelligenceSection
          config={state.appleConfig}
          onToggle={handleToggleAppleIntelligence}
        />

        <BYOKSectionContainer />

        <SemanticSearchSection />

        <ReviewReminderSection />

        <LanguageSection />

        <DesktopSyncSection />

        <DataManagementSection
          busyAction={dataActions.busyAction}
          onExport={() => void handleExportData()}
          onImport={handleImportData}
          onDelete={handleDeleteAllData}
        />

        <Card variant="muted" className="p-4 border-0">
          <Text className="text-[10px] leading-4 text-app-muted font-medium">
            {messages.settings.secureStorageNote}
          </Text>
        </Card>
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}
