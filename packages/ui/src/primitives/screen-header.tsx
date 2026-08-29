import { cva, type VariantProps } from 'class-variance-authority';
import { View, Text } from 'react-native';
import { cn } from '../lib/cn';

const screenHeaderVariants = cva('flex-row items-center justify-between', {
  variants: {
    variant: {
      default: 'px-6 pt-3 pb-3',
      compact: 'px-5 pt-2.5 pb-2.5',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  className?: string;
} & VariantProps<typeof screenHeaderVariants>;

export function ScreenHeader({
  title,
  subtitle,
  icon,
  leftElement,
  rightElement,
  className,
  variant,
}: ScreenHeaderProps) {
  return (
    <View className={cn(screenHeaderVariants({ variant }), className)}>
      <View className="flex-row items-center flex-1 min-w-0">
        {leftElement && (
          <View className="mr-3 items-center justify-center">
            {leftElement}
          </View>
        )}
        <View className="flex-1 min-w-0 justify-center">
          <View className="flex-row items-center">
            {icon && (
              <View className="mr-2 items-center justify-center">
                {icon}
              </View>
            )}
            <Text className="text-2xl font-bold text-app-text tracking-tight flex-1" numberOfLines={1}>
              {title}
            </Text>
          </View>
          {subtitle && (
            <Text className="mt-0.5 text-xs font-medium text-app-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightElement && (
        <View className="ml-3 items-center justify-center">
          {rightElement}
        </View>
      )}
    </View>
  );
}
