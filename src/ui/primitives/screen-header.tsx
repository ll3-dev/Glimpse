import { View, Text } from 'react-native';
import { cn } from '@/src/lib/utils';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  className?: string;
};

export function ScreenHeader({ title, subtitle, rightElement, className }: ScreenHeaderProps) {
  return (
    <View className={cn("px-6 pt-8 pb-4 flex-row items-center justify-between", className)}>
      <View className="flex-1">
        <Text className="text-3xl font-bold text-app-text tracking-tight">{title}</Text>
        {subtitle && (
          <View className="mt-2 flex-row items-center">
            <View className="w-1.5 h-1.5 rounded-full bg-app-subtle mr-2" />
            <Text className="text-sm text-app-muted font-medium">{subtitle}</Text>
          </View>
        )}
      </View>
      {rightElement && (
        <View className="ml-4">
          {rightElement}
        </View>
      )}
    </View>
  );
}
