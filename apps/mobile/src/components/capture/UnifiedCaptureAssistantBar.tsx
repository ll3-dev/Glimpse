import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { ImagePlus, Clipboard as ClipboardIcon, Globe } from 'lucide-react-native';
import { useSemanticColor } from '@glimpse/ui';

interface UnifiedCaptureAssistantBarProps {
  clipboardText: string | null;
  hasBody: boolean;
  hasUrl: boolean;
  hasImage: boolean;
  isFetchingMetadata: boolean;
  ocrRunning: boolean;
  onPasteClipboard: () => void;
  onPickImage: () => void;
  onFetchMetadata: () => void;
}

export function UnifiedCaptureAssistantBar({
  clipboardText,
  hasBody,
  hasUrl,
  hasImage,
  isFetchingMetadata,
  ocrRunning,
  onPasteClipboard,
  onPickImage,
  onFetchMetadata,
}: UnifiedCaptureAssistantBarProps) {
  const appMuted = useSemanticColor('appMuted');
  const appText = useSemanticColor('appText');

  return (
    <View className="mb-4 flex-row flex-wrap items-center gap-2">
      {clipboardText && !hasBody && (
        <Pressable
          onPress={onPasteClipboard}
          className="flex-row items-center rounded-lg border border-app-border bg-app-surface px-3 py-1.5 active:bg-app-bg"
        >
          <ClipboardIcon size={13} color={appMuted} style={{ marginRight: 6 }} />
          <Text className="text-xs font-medium text-app-muted">
            클립보드 붙여넣기
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={onPickImage}
        className="flex-row items-center rounded-lg border border-app-border bg-app-surface px-3 py-1.5 active:bg-app-bg"
      >
        <ImagePlus size={13} color={appMuted} style={{ marginRight: 6 }} />
        <Text className="text-xs font-medium text-app-muted">
          {hasImage ? '사진 변경' : '사진 첨부'}
        </Text>
      </Pressable>

      {hasUrl && (
        <Pressable
          onPress={onFetchMetadata}
          disabled={isFetchingMetadata}
          className="flex-row items-center rounded-lg border border-app-border bg-app-surface px-3 py-1.5 active:bg-app-bg"
        >
          {isFetchingMetadata ? (
            <ActivityIndicator size="small" color={appText} style={{ marginRight: 6 }} />
          ) : (
            <Globe size={13} color={appText} style={{ marginRight: 6 }} />
          )}
          <Text className="text-xs font-medium text-app-text">
            {isFetchingMetadata ? '가져오는 중...' : '웹 제목 자동 추출'}
          </Text>
        </Pressable>
      )}

      {ocrRunning && (
        <View className="flex-row items-center rounded-lg border border-app-border bg-app-surface px-3 py-1.5">
          <ActivityIndicator size="small" color={appMuted} style={{ marginRight: 6 }} />
          <Text className="text-xs font-medium text-app-muted">
            텍스트 인식 중...
          </Text>
        </View>
      )}
    </View>
  );
}
