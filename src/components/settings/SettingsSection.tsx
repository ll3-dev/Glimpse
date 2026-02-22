import { View, Text } from 'react-native';
import { Card } from '@/src/ui/primitives';

type SettingsSectionProps = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function SettingsSection({ title, icon, children, footer }: SettingsSectionProps) {
  return (
    <View className="mb-8">
      <View className="flex-row items-center mb-3">
        {icon && <View className="mr-2">{icon}</View>}
        <Text className="text-sm font-bold text-app-muted uppercase tracking-tight">
          {title}
        </Text>
      </View>

      <Card className="p-4">
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
