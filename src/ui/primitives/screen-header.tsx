import { View, Text } from 'react-native';
import { cn } from '@/src/lib/utils';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  className?: string;
};

export function ScreenHeader({ title, subtitle, leftElement, rightElement, className }: ScreenHeaderProps) {
  return (
    <View className={cn("px-4 pt-3 pb-2 flex-row items-center justify-between", className)}>
      <View className="flex-row items-center flex-1">
        {leftElement && (
          <View className="mr-3">
            {leftElement}
          </View>
        )}
        <View className="flex-1">
          <Text className="text-lg font-bold text-app-text tracking-tight">{title}</Text>
          {subtitle && (
            <View className="mt-1 flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-app-subtle mr-2" />
              <Text className="text-xs text-app-muted font-medium">{subtitle}</Text>
            </View>
          )}
        </View>
      </View>
      {rightElement && (
        <View className="ml-4">
          {rightElement}
        </View>
      )}
    </View>
  );
}
