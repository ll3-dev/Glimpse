import { cva, type VariantProps } from 'class-variance-authority';
import { View, Text } from 'react-native';
import { cn } from '../lib/cn';

const screenHeaderVariants = cva('flex-row items-center justify-between', {
  variants: {
    variant: {
      default: 'px-6 pt-4 pb-4',
      compact: 'px-5 pt-4 pb-3',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  className?: string;
} & VariantProps<typeof screenHeaderVariants>;

export function ScreenHeader({
  title,
  subtitle,
  leftElement,
  rightElement,
  className,
  variant,
}: ScreenHeaderProps) {
  return (
    <View className={cn(screenHeaderVariants({ variant }), className)}>
      <View className="flex-row items-center flex-1">
        {leftElement && (
          <View className="mr-4">
            {leftElement}
          </View>
        )}
        <View className="flex-1">
          <Text className="text-xl font-bold text-app-text tracking-tight">{title}</Text>
          {subtitle && (
            <Text className="mt-1 text-sm font-medium text-app-muted">{subtitle}</Text>
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
