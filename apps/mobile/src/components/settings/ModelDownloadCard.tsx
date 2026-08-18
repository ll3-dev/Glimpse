/**
 * Model Download Card Component
 *
 * Displays a model with download button, progress, and actions.
 */

import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Download, Trash2, Check, AlertCircle, X } from 'lucide-react-native';
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
  /** Callback when active download is cancelled */
  onCancelDownload?: () => void;
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
  onCancelDownload,
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
      className={`rounded-lg border p-3 ${isSelected ? "bg-app-bg border-app-text" : "bg-app-bg border-transparent"} `}
    >
      {/* Header: Model info */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-app-text text-sm font-medium">
              {model.name}
            </Text>
          </View>
          {model.description && (
            <Text className="text-app-muted mt-0.5 text-xs">
              {model.description}
              {model.size && !isDownloading && (
                <Text className="text-app-subtle text-xs"> {model.size}</Text>
              )}
            </Text>
          )}
        </View>

        {/* Status indicator */}
        {isSelected && (
          <View className="bg-app-text flex-row items-center gap-1 rounded-full px-2.5 py-1">
            <Check size={12} color="#fff" />
            <Text className="text-xs font-medium text-white">사용 중</Text>
          </View>
        )}
        {showReadyBadge && (
          <View className="bg-app-border/50 flex-row items-center gap-1 rounded-full px-2 py-1">
            <Check size={12} color="#37352f" />
            <Text className="text-app-text text-xs">다운로드됨</Text>
          </View>
        )}
        {isDownloading && (
          <View className="bg-app-border/50 flex-row items-center gap-1 overflow-hidden rounded-full px-2 py-0.5">
            <ActivityIndicator size="small" color="#37352f" />
            <Text className="text-app-text text-xs">다운로드 중</Text>
          </View>
        )}
        {hasError && (
          <View className="bg-app-border/50 flex-row items-center gap-1 rounded-full px-2 py-0.5">
            <AlertCircle size={12} color="#37352f" />
            <Text className="text-app-text text-xs">오류</Text>
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
        <Text className="text-app-accent mt-2 text-xs">{errorMessage}</Text>
      )}

      {/* Action buttons */}
      <View className="mt-2 flex-row items-center justify-end gap-2">
        {/* Download button */}
        {!isCompleted && !isDownloading && (
          <TouchableOpacity
            onPress={onDownload}
            className="bg-app-text flex-row items-center gap-1.5 rounded-md px-3 py-1.5 active:opacity-80"
          >
            <Download size={14} color="#fff" />
            <Text className="text-xs font-semibold text-white">다운로드</Text>
          </TouchableOpacity>
        )}

        {isDownloading && onCancelDownload && (
          <TouchableOpacity
            onPress={onCancelDownload}
            className="flex-row items-center gap-1.5 rounded-md border border-app-border bg-app-surface px-3 py-1.5 active:opacity-80"
          >
            <X size={14} color="#37352f" />
            <Text className="text-app-text text-xs font-semibold">중단</Text>
          </TouchableOpacity>
        )}

        {/* Select button (for completed models) */}
        {isCompleted && !isSelected && (
          <TouchableOpacity
            onPress={onSelect}
            disabled={!canSelect}
            className={`flex-row items-center gap-1.5 rounded-md border px-3 py-1.5 active:opacity-80 ${canSelect ? "border-app-text bg-app-surface" : "border-app-border bg-app-bg"} `}
          >
            <Check size={14} color={canSelect ? "#37352f" : "#9b9a97"} />
            <Text
              className={`text-xs font-semibold ${canSelect ? "text-app-text" : "text-app-subtle"}`}
            >
              선택
            </Text>
          </TouchableOpacity>
        )}

        {/* Selected indicator */}
        {/* Delete button (for completed models) */}
        {isCompleted && (
          <TouchableOpacity
            onPress={onDelete}
            className="border-app-border bg-app-bg flex-row items-center gap-1.5 rounded-md border px-2 py-1.5"
          >
            <Trash2 size={14} color="#787774" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
