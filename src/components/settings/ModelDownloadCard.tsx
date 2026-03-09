/**
 * Model Download Card Component
 *
 * Displays a model with download button, progress, and actions.
 */

import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Download, Trash2, Check, AlertCircle } from 'lucide-react-native';
import type { ModelInfo } from '@/src/features/ai/model-manager';
import { ModelDownloadProgress } from './ModelDownloadProgress';

type DownloadStatus = 'idle' | 'downloading' | 'completed' | 'error';

type ModelDownloadCardProps = {
  /** Model information */
  model: ModelInfo;
  /** Download status */
  status: DownloadStatus;
  /** Whether this model is currently selected */
  isSelected: boolean;
  /** Download progress (0-100) */
  downloadProgress?: {
    written: number;
    total: number;
    percentage: number;
  };
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Callback when download button is pressed */
  onDownload: () => void;
  /** Callback when delete button is pressed */
  onDelete: () => void;
  /** Callback when model is selected */
  onSelect: () => void;
  /** Whether selection is allowed (model must be ready) */
  canSelect: boolean;
};

export function ModelDownloadCard({
  model,
  status,
  isSelected,
  downloadProgress,
  errorMessage,
  onDownload,
  onDelete,
  onSelect,
  canSelect,
}: ModelDownloadCardProps) {
  const isDownloading = status === 'downloading';
  const isCompleted = status === 'completed';
  const hasError = status === 'error';
  const showReadyBadge = isCompleted && !isSelected;

  return (
    <View
      className={`
        p-3 rounded-lg border
        ${isSelected ? 'bg-app-bg border-app-text' : 'bg-app-bg border-transparent'}
      `}
    >
      {/* Header: Model info */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-medium text-app-text">{model.name}</Text>
            {model.size && !isDownloading && (
              <Text className="text-xs text-app-subtle">{model.size}</Text>
            )}
          </View>
          {model.description && (
            <Text className="text-xs text-app-muted mt-0.5">{model.description}</Text>
          )}
        </View>

        {/* Status indicator */}
        {isSelected && (
          <View className="flex-row items-center gap-1 bg-app-text px-2.5 py-1 rounded-full">
            <Check size={12} color="#fff" />
            <Text className="text-xs font-medium text-white">사용 중</Text>
          </View>
        )}
        {showReadyBadge && (
          <View className="flex-row items-center gap-1 bg-app-border/50 px-2 py-1 rounded-full">
            <Check size={12} color="#37352f" />
            <Text className="text-xs text-app-text">다운로드됨</Text>
          </View>
        )}
        {isDownloading && (
          <View className="flex-row items-center gap-1 bg-app-border/50 px-2 py-0.5 rounded-full overflow-hidden">
            <ActivityIndicator size="small" color="#37352f" />
            <Text className="text-xs text-app-text">다운로드 중</Text>
          </View>
        )}
        {hasError && (
          <View className="flex-row items-center gap-1 bg-app-border/50 px-2 py-0.5 rounded-full">
            <AlertCircle size={12} color="#37352f" />
            <Text className="text-xs text-app-text">오류</Text>
          </View>
        )}
      </View>

      {/* Download progress */}
      {isDownloading && downloadProgress && (
        <ModelDownloadProgress
          written={downloadProgress.written}
          total={downloadProgress.total}
          percentage={downloadProgress.percentage}
          expectedSize={model.size}
        />
      )}

      {/* Error message */}
      {hasError && errorMessage && (
        <Text className="text-xs text-app-accent mt-2">{errorMessage}</Text>
      )}

      {/* Action buttons */}
      <View className="flex-row items-center justify-end gap-2 mt-2">
        {/* Download button */}
        {!isCompleted && !isDownloading && (
          <TouchableOpacity
            onPress={onDownload}
            className="flex-row items-center gap-1.5 bg-app-text px-3 py-1.5 rounded-md"
          >
            <Download size={14} color="#fff" />
            <Text className="text-xs font-medium text-white">다운로드</Text>
          </TouchableOpacity>
        )}

        {/* Select button (for completed models) */}
        {isCompleted && !isSelected && (
          <TouchableOpacity
            onPress={onSelect}
            disabled={!canSelect}
            className={`
              flex-row items-center gap-1.5 px-3 py-1.5 rounded-md border
              ${canSelect ? 'border-app-text bg-white' : 'border-app-border bg-gray-50'}
            `}
          >
            <Check size={14} color={canSelect ? '#37352f' : '#9ca3af'} />
            <Text className={`text-xs font-medium ${canSelect ? 'text-app-text' : 'text-app-subtle'}`}>
              선택
            </Text>
          </TouchableOpacity>
        )}

        {/* Selected indicator */}
        {/* Delete button (for completed models) */}
        {isCompleted && (
          <TouchableOpacity
            onPress={onDelete}
            className="flex-row items-center gap-1.5 px-2 py-1.5 rounded-md border border-app-border bg-app-bg"
          >
            <Trash2 size={14} color="#787774" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
