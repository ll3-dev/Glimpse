/**
 * Model Download Progress Component
 *
 * Displays download progress bar with bytes transferred.
 */

import { View, Text } from 'react-native';
import { Progress } from '@glimpse/ui/primitives/progress';
import { ModelDownloader } from '@/src/features/ai/model-manager';

type ModelDownloadProgressProps = {
  /** Bytes written so far */
  written: number;
  /** Total bytes to download */
  total: number;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Expected model size for display when total is unknown */
  expectedSize?: string;
};

export function ModelDownloadProgress({ written, total, percentage, expectedSize }: ModelDownloadProgressProps) {
  const writtenFormatted = ModelDownloader.formatBytes(written);
  const totalFormatted = total > 0 ? ModelDownloader.formatBytes(total) : (expectedSize ?? '계산 중...');

  return (
    <View className="mt-2">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-xs text-app-muted">{percentage}%</Text>
        <Text className="text-xs text-app-subtle">
          {writtenFormatted} / {totalFormatted}
        </Text>
      </View>
      <Progress value={percentage} className="h-2" />
    </View>
  );
}
