import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ScreenHeader } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { SettingsOverviewCard } from '@/src/components/settings/SettingsOverviewCard';
import { UnifiedAISettingsSection } from '@/src/components/settings/UnifiedAISettingsSection';
import { ReviewReminderSection } from '@/src/components/settings/ReviewReminderSection';
import { ThemeSection } from '@/src/components/settings/ThemeSection';
import { LanguageSection } from '@/src/components/settings/LanguageSection';
import { DesktopSyncSection } from '@/src/components/settings/DesktopSyncSection';
import { DataManagementSection } from '@/src/components/settings/DataManagementSection';
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
        leftElement={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={messages.common.back}
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-app-border/40"
          >
            <ArrowLeft size={22} color={appText} />
          </Pressable>
        }
      />

      <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>
        {/* Active AI Profile Overview Banner */}
        <SettingsOverviewCard />

        {/* Group 1: AI & Intelligence */}
        <UnifiedAISettingsSection
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

        {/* Group 2: General & Notifications */}
        <ReviewReminderSection />
        <ThemeSection />
        <LanguageSection />

        {/* Group 3: Sync & Data */}
        <DesktopSyncSection />
        <DataManagementSection
          busyAction={dataActions.busyAction}
          onExport={() => void handleExportData()}
          onImport={handleImportData}
          onDelete={handleDeleteAllData}
        />

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}
