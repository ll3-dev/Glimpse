import { View, Text } from 'react-native';
import { cn } from '../lib/cn';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  className?: string;
};

export function ScreenHeader({ title, subtitle, leftElement, rightElement, className }: ScreenHeaderProps) {
  return (
    <View className={cn("px-5 pt-4 pb-3 flex-row items-center justify-between", className)}>
      <View className="flex-row items-center flex-1">
        {leftElement && (
          <View className="mr-3">
            {leftElement}
          </View>
        )}
        <View className="flex-1">
          <Text className="text-[22px] font-bold text-app-text tracking-[-0.02em]">{title}</Text>
          {subtitle && (
            <View className="mt-1 flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-app-primary/70 mr-2" />
              <Text className="text-xs text-app-muted font-medium tracking-tight">{subtitle}</Text>
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
