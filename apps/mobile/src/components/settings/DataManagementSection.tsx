import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SettingsSection } from './SettingsSection';
import type { DataAction } from '@/src/hooks/useDataManagementActions';
import { useAppLocale } from '@/src/localization';

type DataManagementSectionProps = {
  busyAction: DataAction | null;
  onExport: () => void;
  onImport: () => void;
  onDelete: () => void;
};

type ActionRowProps = {
  action: DataAction;
  title: string;
  description: string;
  destructive?: boolean;
  busyLabel: string;
  busyAction: DataAction | null;
  onPress: () => void;
};

function ActionRow({
  action,
  title,
  description,
  destructive = false,
  busyLabel,
  busyAction,
  onPress,
}: ActionRowProps) {
  const busy = busyAction === action;
  const disabled = busyAction !== null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-14 flex-row items-center py-3 active:opacity-70 disabled:opacity-50"
    >
      <View className="flex-1 pr-4">
        <Text
          className={
            destructive
              ? 'text-sm font-semibold text-destructive'
              : 'text-sm font-semibold text-app-text'
          }
        >
          {title}
        </Text>
        <Text className="mt-0.5 text-xs leading-4 text-app-muted">{description}</Text>
      </View>
      {busy && <ActivityIndicator accessibilityLabel={busyLabel} size="small" />}
    </Pressable>
  );
}

export function DataManagementSection({
  busyAction,
  onExport,
  onImport,
  onDelete,
}: DataManagementSectionProps) {
  const { messages } = useAppLocale();

  return (
    <SettingsSection
      title={messages.data.title}
      footer={messages.data.footer}
    >
      <ActionRow
        action="export"
        title={messages.data.exportTitle}
        description={messages.data.exportDescription}
        busyLabel={messages.data.busyLabel(messages.data.exportTitle)}
        busyAction={busyAction}
        onPress={onExport}
      />
      <View className="h-px bg-app-border" />
      <ActionRow
        action="import"
        title={messages.data.importTitle}
        description={messages.data.importDescription}
        busyLabel={messages.data.busyLabel(messages.data.importTitle)}
        busyAction={busyAction}
        onPress={onImport}
      />
      <View className="h-px bg-app-border" />
      <ActionRow
        action="delete"
        title={messages.data.deleteTitle}
        description={messages.data.deleteDescription}
        busyLabel={messages.data.busyLabel(messages.data.deleteTitle)}
        destructive
        busyAction={busyAction}
        onPress={onDelete}
      />
    </SettingsSection>
  );
}
