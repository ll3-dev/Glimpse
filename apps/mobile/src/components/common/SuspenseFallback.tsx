import { View } from 'react-native';
import { Skeleton } from '@glimpse/ui/primitives/skeleton';

interface SuspenseFallbackProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Custom header skeleton */
  showHeader?: boolean;
}

export function SuspenseFallback({ count = 3, showHeader = true }: SuspenseFallbackProps) {
  return (
    <View className="flex-1 bg-app-bg px-6 pt-4">
      {showHeader && (
        <View className="mb-6">
          <Skeleton width="40%" height={28} radius={6} className="mb-2" />
          <Skeleton width="65%" height={16} radius={4} />
        </View>
      )}

      <View className="space-y-4">
        {Array.from({ length: count }).map((_, index) => (
          <View
            key={`skeleton-card-${index}`}
            className="rounded-xl border border-app-border bg-app-card p-4 mb-3"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Skeleton width="60%" height={20} radius={4} />
              <Skeleton width={48} height={16} radius={4} />
            </View>
            <Skeleton width="90%" height={14} radius={4} className="mb-1" />
            <Skeleton width="75%" height={14} radius={4} className="mb-3" />
            <View className="flex-row gap-2">
              <Skeleton width={56} height={22} radius={12} />
              <Skeleton width={64} height={22} radius={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
