import { View, Text } from 'react-native';
import { Card } from '@glimpse/ui/primitives';

type SettingsSectionProps = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function SettingsSection({ title, icon, children, footer }: SettingsSectionProps) {
  return (
    <View className="mb-6">
      <View className="flex-row items-center mb-2.5 px-0.5">
        {icon && <View className="mr-2">{icon}</View>}
        <Text className="text-xs font-bold text-app-muted uppercase tracking-wider">
          {title}
        </Text>
      </View>

      <Card className="p-4 rounded-2xl border border-app-border bg-app-surface">
        {children}
      </Card>

      {footer && (
        <View className="mt-2">
          {typeof footer === 'string' ? (
             <Text className="text-[10px] text-app-subtle font-medium text-center">
               {footer}
             </Text>
          ) : (
            footer
          )}
        </View>
      )}
    </View>
  );
}
